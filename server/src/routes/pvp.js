const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { BOT_TRAINERS, liveActivities, pushActivity, pickBotMove } = require('../services/botSimulation');
const { calculateAttack, getValidMegaProfile, getValidZMove } = require('../services/battleEngine');

const router = express.Router();

// Active Single-Player Bot PvP Battles (userId -> battle)
const activePvpBattles = new Map();

// Active Challenges (challengeId -> challenge)
const pvpChallenges = new Map();

// Active 2-Player Battle Rooms (roomId -> roomState)
const pvpRooms = new Map();

// Challenger Cooldown Map (userId -> timestamp of challenge sent)
const challengeCooldowns = new Map();
const CHALLENGE_COOLDOWN_MS = 60 * 1000; // 1 minute (60 seconds) cooldown to prevent spam

// Helper to load user's full battle team
async function loadUserBattleTeam(userId) {
  const teamRes = await db.query(
    `SELECT 
      up.id, up.nickname, up.level, up.current_hp, up.max_hp, up.stats, up.moves, up.team_position,
      up.held_item_id, up.held_item_name,
      p.name, p.types, p.sprite_url, p.artwork_url
     FROM user_pokemons up
     JOIN pokemons p ON up.pokemon_id = p.id
     WHERE up.user_id = $1 AND up.is_in_team = TRUE
     ORDER BY up.team_position ASC`,
    [userId]
  );
  return teamRes.rows.map(p => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname || p.name,
    level: p.level || 50,
    hp: p.max_hp || 200,
    maxHp: p.max_hp || 200,
    baseMaxHp: p.max_hp || 200,
    types: Array.isArray(p.types) ? p.types : JSON.parse(p.types || '[]'),
    stats: typeof p.stats === 'object' ? p.stats : JSON.parse(p.stats || '{}'),
    baseStats: typeof p.stats === 'object' ? p.stats : JSON.parse(p.stats || '{}'),
    moves: (Array.isArray(p.moves) ? p.moves : JSON.parse(p.moves || '[]')).slice(0, 4),
    sprite: p.sprite_url,
    artwork: p.artwork_url,
    baseSprite: p.sprite_url,
    baseArtwork: p.artwork_url,
    held_item_id: p.held_item_id,
    held_item_name: p.held_item_name,
    isMega: false,
    isDynamax: false,
    dynamaxTurns: 0
  }));
}

// ==========================================
// 1. GET PVP LOBBY (Real Users + Bots)
// ==========================================
router.get('/lobby', async (req, res) => {
  try {
    // 1. Query real registered users with active battle teams
    const realUsersRes = await db.query(
      `SELECT DISTINCT u.id, u.username, u.wallet_address, u.fuku_balance
       FROM users u
       JOIN user_pokemons up ON u.id = up.user_id
       WHERE up.is_in_team = TRUE
       ORDER BY u.id ASC`
    );

    const realOpponents = [];
    for (const u of realUsersRes.rows) {
      if (u.username.startsWith('system_')) continue;

      const team = await loadUserBattleTeam(u.id);
      if (team.length === 0) continue;

      let avatar = 'https://play.pokemonshowdown.com/sprites/trainers/red.png';
      if (u.username.includes('ash')) avatar = 'https://play.pokemonshowdown.com/sprites/trainers/ash.png';
      else if (u.username.includes('gary') || u.username.includes('blue')) avatar = 'https://play.pokemonshowdown.com/sprites/trainers/blue.png';
      else if (u.username.includes('cynthia')) avatar = 'https://play.pokemonshowdown.com/sprites/trainers/cynthia.png';
      else if (u.username.includes('lance')) avatar = 'https://play.pokemonshowdown.com/sprites/trainers/lance.png';
      else if (u.username.includes('steven')) avatar = 'https://play.pokemonshowdown.com/sprites/trainers/steven.png';
      else avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`;

      const balance = parseFloat(u.fuku_balance || 0);
      const mmr = 1200 + Math.min(600, Math.floor(balance / 500));

      realOpponents.push({
        id: `user_${u.id}`,
        userId: u.id,
        username: u.username,
        name: `${u.username} (ผู้เล่นจริง)`,
        avatar,
        mmr,
        wager: 1000,
        defaultWager: 1000,
        title: 'เทรนเนอร์ผู้เล่นจริง',
        isRealPlayer: true,
        pokemonCount: team.length,
        team: team.map(p => ({
          name: p.name,
          level: 50,
          types: p.types,
          sprite: p.sprite
        })),
        teamPreview: team.map(p => ({
          name: p.name,
          level: 50,
          types: p.types,
          sprite: p.sprite
        }))
      });
    }

    // 2. Simulated Bot Trainers
    const botOpponents = BOT_TRAINERS.map((b, idx) => ({
      id: `bot_${idx + 1}`,
      username: b.username,
      name: b.name,
      avatar: b.avatar,
      mmr: b.mmr,
      wager: b.wager,
      defaultWager: b.wager,
      title: b.title || 'เทรนเนอร์จำลอง',
      isRealPlayer: false,
      pokemonCount: b.team.length,
      team: b.team.map(p => ({
        name: p.name,
        level: 50,
        types: p.types,
        sprite: p.sprite
      })),
      teamPreview: b.team.map(p => ({
        name: p.name,
        level: 50,
        types: p.types,
        sprite: p.sprite
      }))
    }));

    res.json({ opponents: [...realOpponents, ...botOpponents] });
  } catch (err) {
    console.error('Lobby error:', err);
    res.status(500).json({ error: 'ไม่สามารถโหลดล็อบบี้ได้' });
  }
});

// Get real-time activities feed
router.get('/activities', (req, res) => {
  res.json({ activities: liveActivities });
});

// ==========================================
// 2. CHALLENGE ENDPOINT
// ==========================================
router.post('/challenge', authMiddleware, async (req, res) => {
  const target = req.body.targetUsername || req.body.opponentUsername;
  const rawWager = req.body.customWager || req.body.wager;
  const userId = req.user.id;
  const wager = Math.max(100, parseFloat(rawWager || 1000));

  // Check user balance
  const userRes = await db.query('SELECT fuku_balance FROM users WHERE id = $1', [userId]);
  const userBalance = parseFloat(userRes.rows[0].fuku_balance);

  if (userBalance < wager) {
    return res.status(400).json({ 
      error: `เหรียญ FUKU ของคุณไม่พอสำหรับเดิมพัน ${wager.toLocaleString()} FUKU (มี ${userBalance.toLocaleString()} FUKU)` 
    });
  }

  // Load user's team
  const userTeam = await loadUserBattleTeam(userId);
  if (userTeam.length === 0) {
    return res.status(400).json({ error: 'กรุณาจัดทีมต่อสู้อย่างน้อย 1 ตัวในหน้าคลังก่อนเริ่มประลอง PvP' });
  }

  // Check if target is a simulated bot trainer first
  const isBot = BOT_TRAINERS.some(b => b.username.toLowerCase() === (target || '').toLowerCase());

  // Check if target is a real registered user in DB (and not a bot and not self)
  const targetUserRes = await db.query(
    'SELECT id, username, fuku_balance FROM users WHERE LOWER(username) = LOWER($1)',
    [target]
  );

  const isRealTarget = !isBot && targetUserRes.rows.length > 0 && targetUserRes.rows[0].id !== userId;

  if (isRealTarget) {
    const targetUser = targetUserRes.rows[0];
    const targetBalance = parseFloat(targetUser.fuku_balance || 0);

    // 1. Cooldown Check per-person (คนต่อคน): 1 minute cooldown per (challenger -> target) to prevent spamming the same user
    const cdKey = `${userId}:${targetUser.id}`;
    const lastChallenge = challengeCooldowns.get(cdKey);
    if (lastChallenge && (Date.now() - lastChallenge) < CHALLENGE_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((CHALLENGE_COOLDOWN_MS - (Date.now() - lastChallenge)) / 1000);
      return res.status(429).json({
        error: `คุณส่งคำท้าไปยัง @${targetUser.username} เร็วเกินไป กรุณารอคูลดาวน์อีก ${remainingSeconds} วินาทีก่อนส่งคำท้าหาผู้เล่นนี้ใหม่ได้ (เพื่อป้องกันการสแปม)`,
        remainingSeconds,
        targetUsername: targetUser.username,
        targetId: targetUser.id
      });
    }

    // 2. Check if challenger already has a pending challenge waiting for this target
    const challengerPending = Array.from(pvpChallenges.values()).find(
      c => c.challengerId === userId && c.targetId === targetUser.id && c.status === 'PENDING' && (Date.now() - c.createdAt) < 60000
    );
    if (challengerPending) {
      return res.status(400).json({
        error: `คุณมีคำท้าไปยัง @${targetUser.username} ที่กำลังรอการตอบรับอยู่แล้ว กรุณารอหรือกดยกเลิกคำท้าเดิมก่อน`
      });
    }

    // 3. Check if target user is currently in an active battle room
    const isTargetInBattle = Array.from(pvpRooms.values()).some(
      r => r && ((r.p1 && r.p1.userId === targetUser.id) || (r.p2 && r.p2.userId === targetUser.id)) && r.status === 'IN_PROGRESS'
    );
    if (isTargetInBattle) {
      return res.status(400).json({
        error: `ผู้เล่น @${targetUser.username} กำลังอยู่ระหว่างการประลองในสนาม กรุณาลองใหม่อีกครั้งเมื่อการประลองเสร็จสิ้น`
      });
    }

    // 4. Check if target user already has an incoming pending challenge waiting
    const targetPending = Array.from(pvpChallenges.values()).find(
      c => c.targetId === targetUser.id && c.status === 'PENDING' && (Date.now() - c.createdAt) < 60000
    );
    if (targetPending) {
      return res.status(400).json({
        error: `ผู้เล่น @${targetUser.username} กำลังมีคำท้าประลองรอการตอบรับอยู่ กรุณารอสักครู่`
      });
    }

    if (targetBalance < wager) {
      return res.status(400).json({
        error: `ผู้เล่น @${targetUser.username} มีเหรียญ FUKU ไม่เพียงพอสำหรับเดิมพันนี้ (มี ${targetBalance.toLocaleString()} FUKU)`
      });
    }

    const targetTeam = await loadUserBattleTeam(targetUser.id);
    if (targetTeam.length === 0) {
      return res.status(400).json({
        error: `ผู้เล่น @${targetUser.username} ยังไม่มีโปเกมอนในทีมต่อสู้ (ต้องจัดทีมในหน้าคลังก่อน)`
      });
    }

    // Set challenger-to-target cooldown timestamp (คนต่อคน)
    challengeCooldowns.set(cdKey, Date.now());

    const challengeId = 'chal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const challenge = {
      id: challengeId,
      challengerId: userId,
      challengerUsername: req.user.username,
      challengerName: req.user.username,
      challengerAvatar: req.user.username.includes('ash') 
        ? 'https://play.pokemonshowdown.com/sprites/trainers/ash.png'
        : 'https://play.pokemonshowdown.com/sprites/trainers/red.png',
      challengerTeamPreview: userTeam.slice(0, 3).map(p => ({ name: p.name, sprite: p.sprite, types: p.types })),
      targetId: targetUser.id,
      targetUsername: targetUser.username,
      targetName: targetUser.username,
      targetAvatar: targetUser.username.includes('ash')
        ? 'https://play.pokemonshowdown.com/sprites/trainers/ash.png'
        : 'https://play.pokemonshowdown.com/sprites/trainers/red.png',
      wager,
      prizePool: wager * 2,
      status: 'PENDING',
      createdAt: Date.now(),
      battleRoomId: null
    };

    pvpChallenges.set(challengeId, challenge);

    pushActivity(
      'pvp_challenge',
      req.user.username,
      challenge.challengerAvatar,
      `ส่งคำท้าดวล PvP ไปยัง @${targetUser.username} เดิมพันรวม ${(wager * 2).toLocaleString()} FUKU!`,
      { wager, opponent: targetUser.username }
    );

    return res.json({
      success: true,
      isRealPlayer: true,
      challengeId,
      challenge,
      cooldownSeconds: 60,
      message: `ส่งคำท้าประลองไปยัง @${targetUser.username} เรียบร้อยแล้ว รอการตอบรับ...`
    });
  }

  // --- Bot Trainer Challenge ---
  const opponent = BOT_TRAINERS.find(b => b.username === target) || BOT_TRAINERS[0];
  await db.query('UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2', [wager, userId]);

  const opponentTeam = JSON.parse(JSON.stringify(opponent.team)).map(p => ({
    ...p,
    baseMaxHp: p.maxHp,
    isMega: false,
    isDynamax: false
  }));

  const pvpBattle = {
    opponentUsername: opponent.username,
    opponentName: opponent.name,
    opponentAvatar: opponent.avatar,
    wager,
    prizePool: wager * 2,
    userTeam,
    userActiveIndex: 0,
    opponentTeam,
    opponentActiveIndex: 0,
    userMegaUsed: false,
    userZMoveUsed: false,
    userDynamaxUsed: false,
    turn: 1,
    status: 'IN_PROGRESS',
    isMultiplayer: false,
    logs: [
      `เริ่มต้นการแข่งขัน PvP 3v3 เดิมพันรวม ${(wager * 2).toLocaleString()} FUKU!`,
      `[Battle] ${req.user.username} ส่ง ${userTeam[0].nickname} เข้าสู่สังเวียน!`,
      `[Battle] ${opponent.name} ส่ง ${opponentTeam[0].name} เข้าสู่สังเวียน!`
    ]
  };

  activePvpBattles.set(userId, pvpBattle);

  pushActivity(
    'pvp_challenge',
    req.user.username,
    'https://play.pokemonshowdown.com/sprites/trainers/red.png',
    `ท้าดวล PvP กับ ${opponent.name} เดิมพันรวม ${(wager * 2).toLocaleString()} FUKU!`,
    { wager, opponent: opponent.name }
  );

  res.json({
    message: 'เข้าสู่การประลอง PvP สำเร็จ!',
    battle: pvpBattle
  });
});

// ==========================================
// 3. CHALLENGE MANAGEMENT APIS
// ==========================================

// Get active challenger cooldowns per target (คนต่อคน) for current user
router.get('/challenge-cooldown', authMiddleware, async (req, res) => {
  const myId = req.user.id;
  const prefix = `${myId}:`;
  const cooldowns = {};
  const now = Date.now();

  for (const [key, timestamp] of challengeCooldowns.entries()) {
    if (key.startsWith(prefix) && (now - timestamp) < CHALLENGE_COOLDOWN_MS) {
      const targetId = key.substring(prefix.length);
      const remainingSeconds = Math.ceil((CHALLENGE_COOLDOWN_MS - (now - timestamp)) / 1000);
      cooldowns[targetId] = remainingSeconds;
    }
  }

  // Also attach target usernames so frontend can look up by username or id
  const targetIds = Object.keys(cooldowns).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (targetIds.length > 0) {
    try {
      const usersRes = await db.query('SELECT id, username FROM users WHERE id = ANY($1)', [targetIds]);
      for (const u of usersRes.rows) {
        const sec = cooldowns[u.id];
        if (sec) {
          cooldowns[u.username.toLowerCase()] = sec;
        }
      }
    } catch (e) {
      console.error('Error querying target usernames for cooldown:', e);
    }
  }

  res.json({ cooldowns });
});

// Get incoming pending challenges for current user
router.get('/challenges/incoming', authMiddleware, (req, res) => {
  const myUsername = (req.user.username || '').toLowerCase();
  const incoming = [];
  const now = Date.now();

  for (const challenge of pvpChallenges.values()) {
    if (challenge.status === 'PENDING' && now - challenge.createdAt > 60000) {
      challenge.status = 'EXPIRED';
    }
    if (challenge.targetUsername.toLowerCase() === myUsername && challenge.status === 'PENDING') {
      incoming.push(challenge);
    }
  }

  res.json({ challenges: incoming });
});

// Get status of a challenge
router.get('/challenges/:challengeId/status', authMiddleware, (req, res) => {
  const challenge = pvpChallenges.get(req.params.challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'ไม่พบคำท้าประลองนี้' });
  }

  res.json({
    id: challenge.id,
    status: challenge.status,
    roomId: challenge.battleRoomId,
    targetUsername: challenge.targetUsername,
    challengerUsername: challenge.challengerUsername
  });
});

// Cancel challenge (by challenger)
router.post('/challenges/:challengeId/cancel', authMiddleware, (req, res) => {
  const challenge = pvpChallenges.get(req.params.challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'ไม่พบคำท้าประลองนี้' });
  }
  if (challenge.challengerId !== req.user.id && challenge.challengerUsername.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ยกเลิกคำท้านี้' });
  }
  if (challenge.status !== 'PENDING') {
    return res.status(400).json({ error: `คำท้านี้อยู่ในสถานะ ${challenge.status} แล้ว` });
  }

  challenge.status = 'CANCELLED';
  res.json({ success: true, message: 'ยกเลิกคำท้าประลองสำเร็จ' });
});

// Decline challenge (by target)
router.post('/challenges/:challengeId/decline', authMiddleware, (req, res) => {
  const challenge = pvpChallenges.get(req.params.challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'ไม่พบคำท้าประลองนี้' });
  }
  if (challenge.targetId !== req.user.id && challenge.targetUsername.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'คุณไม่ใช่ผู้รับคำท้านี้' });
  }
  if (challenge.status !== 'PENDING') {
    return res.status(400).json({ error: `คำท้านี้อยู่ในสถานะ ${challenge.status} แล้ว` });
  }

  challenge.status = 'DECLINED';
  res.json({ success: true, message: 'ปฏิเสธคำท้าประลองแล้ว' });
});

// Accept challenge (by target) -> creates room
router.post('/challenges/:challengeId/accept', authMiddleware, async (req, res) => {
  const challenge = pvpChallenges.get(req.params.challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'ไม่พบคำท้าประลองนี้' });
  }
  if (challenge.targetId !== req.user.id && challenge.targetUsername.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'คุณไม่ใช่ผู้รับคำท้านี้' });
  }
  if (challenge.status !== 'PENDING') {
    return res.status(400).json({ error: `คำท้านี้ไม่อยู่ในสถานะรอตอบรับ (${challenge.status})` });
  }

  const p1Id = challenge.challengerId;
  const p2Id = challenge.targetId;
  const wager = challenge.wager;

  // Verify balances of both players
  const p1Res = await db.query('SELECT fuku_balance FROM users WHERE id = $1', [p1Id]);
  const p2Res = await db.query('SELECT fuku_balance FROM users WHERE id = $1', [p2Id]);

  if (parseFloat(p1Res.rows[0].fuku_balance) < wager) {
    challenge.status = 'CANCELLED';
    return res.status(400).json({ error: `ผู้ท้า @${challenge.challengerUsername} มีเหรียญ FUKU ไม่เพียงพอ` });
  }
  if (parseFloat(p2Res.rows[0].fuku_balance) < wager) {
    return res.status(400).json({ error: `คุณมีเหรียญ FUKU ไม่เพียงพอสำหรับการตอบรับเดิมพัน ${wager.toLocaleString()} FUKU` });
  }

  // Load both teams
  const p1Team = await loadUserBattleTeam(p1Id);
  const p2Team = await loadUserBattleTeam(p2Id);

  if (p1Team.length === 0 || p2Team.length === 0) {
    return res.status(400).json({ error: 'ทีมต่อสู้ของฝ่ายใดฝ่ายหนึ่งไม่พร้อม' });
  }

  // Deduct wager from both players
  await db.query('UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2', [wager, p1Id]);
  await db.query('UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2', [wager, p2Id]);

  const roomId = 'room_' + challenge.id;
  const roomState = {
    roomId,
    wager,
    prizePool: wager * 2,
    status: 'IN_PROGRESS',
    turn: 1,
    turnLogs: [
      `เริ่มต้นการแข่งขัน PvP ระหว่าง @${challenge.challengerUsername} กับ @${challenge.targetUsername}!`,
      `เดิมพันรวม: ${(wager * 2).toLocaleString()} FUKU!`,
      `@${challenge.challengerUsername} ส่ง ${p1Team[0].nickname} ลงสนาม!`,
      `@${challenge.targetUsername} ส่ง ${p2Team[0].nickname} ลงสนาม!`
    ],
    logs: [
      `เริ่มต้นการแข่งขัน PvP ระหว่าง @${challenge.challengerUsername} กับ @${challenge.targetUsername}!`,
      `เดิมพันรวม: ${(wager * 2).toLocaleString()} FUKU!`,
      `@${challenge.challengerUsername} ส่ง ${p1Team[0].nickname} ลงสนาม!`,
      `@${challenge.targetUsername} ส่ง ${p2Team[0].nickname} ลงสนาม!`
    ],
    lastActionSequence: [],
    winner: null,
    p1: {
      userId: p1Id,
      username: challenge.challengerUsername,
      avatar: challenge.challengerAvatar,
      team: p1Team,
      activeIndex: 0,
      megaUsed: false,
      zMoveUsed: false,
      dynamaxUsed: false,
      action: null,
      hasActed: false
    },
    p2: {
      userId: p2Id,
      username: challenge.targetUsername,
      avatar: challenge.targetAvatar,
      team: p2Team,
      activeIndex: 0,
      megaUsed: false,
      zMoveUsed: false,
      dynamaxUsed: false,
      action: null,
      hasActed: false
    }
  };

  pvpRooms.set(roomId, roomState);
  challenge.status = 'ACCEPTED';
  challenge.battleRoomId = roomId;

  pushActivity(
    'pvp_challenge',
    challenge.targetUsername,
    challenge.targetAvatar,
    `ตอบรับคำท้าดวล PvP ของ @${challenge.challengerUsername}! เข้าสู่สังเวียนประลองเงินเดิมพัน ${(wager * 2).toLocaleString()} FUKU!`
  );

  res.json({
    success: true,
    roomId,
    message: 'ตอบรับคำท้าประลองสำเร็จ เข้าสู่ห้องต่อสู้!'
  });
});

// ==========================================
// 4. SHARED MULTIPLAYER BATTLE ROOM APIS
// ==========================================

// Get room status from player's perspective
router.get('/room/:roomId', authMiddleware, (req, res) => {
  const room = pvpRooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องประลองนี้' });
  }

  const userId = req.user.id;
  const isP1 = room.p1.userId === userId;
  const isP2 = room.p2.userId === userId;

  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'คุณไม่ได้อยู่ในห้องประลองนี้' });
  }

  const myPlayer = isP1 ? room.p1 : room.p2;
  const oppPlayer = isP1 ? room.p2 : room.p1;

  res.json({
    roomId: room.roomId,
    status: room.status,
    turn: room.turn,
    wager: room.wager,
    prizePool: room.prizePool,
    winner: room.winner,
    isWinner: room.winner === myPlayer.username,
    isLoser: Boolean(room.winner && room.winner !== myPlayer.username),
    isMultiplayer: true,
    userTeam: myPlayer.team,
    userActiveIndex: myPlayer.activeIndex,
    opponentTeam: oppPlayer.team,
    opponentActiveIndex: oppPlayer.activeIndex,
    opponentUsername: oppPlayer.username,
    opponentName: oppPlayer.username,
    opponentAvatar: oppPlayer.avatar,
    userMegaUsed: myPlayer.megaUsed,
    userZMoveUsed: myPlayer.zMoveUsed,
    userDynamaxUsed: myPlayer.dynamaxUsed,
    hasActed: myPlayer.hasActed,
    waitingForOpponent: myPlayer.hasActed && !oppPlayer.hasActed,
    opponentHasActed: oppPlayer.hasActed,
    logs: room.logs,
    turnLogs: room.turnLogs,
    actionSequence: room.lastActionSequence || []
  });
});

// Helper to resolve 2-player turn
async function resolveMultiplayerTurn(room, turnLogs, actionSequence) {
  const p1 = room.p1;
  const p2 = room.p2;

  // 1. Process items / switches first (Priority)
  for (const [player, opp, isP1] of [[p1, p2, true], [p2, p1, false]]) {
    if (player.action?.action === 'use_item') {
      const itemRes = await db.query(
        `SELECT ui.*, i.name, i.code, i.effect_type, i.effect_value 
         FROM user_items ui JOIN items i ON ui.item_id = i.id 
         WHERE ui.item_id = $1 AND ui.user_id = $2 AND ui.quantity > 0`,
        [player.action.itemId, player.userId]
      );
      if (itemRes.rows.length > 0) {
        const item = itemRes.rows[0];
        const targetMon = player.team[player.activeIndex];
        if (item.effect_type === 'HEAL_HP' && targetMon.hp > 0) {
          const healAmount = Math.min(targetMon.maxHp - targetMon.hp, Math.round(parseFloat(item.effect_value)));
          targetMon.hp += healAmount;
          turnLogs.push(`[Item] @${player.username} ใช้ ${item.name} ฟื้นฟู HP +${healAmount}!`);
          actionSequence.push({ type: 'ACTION_ITEM', actor: isP1 ? 'user' : 'opponent', healAmount });
          await db.query('UPDATE user_items SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2', [player.userId, player.action.itemId]);
        }
      }
    } else if (player.action?.action === 'switch') {
      const newIdx = player.action.switchIndex;
      if (newIdx !== undefined && newIdx >= 0 && newIdx < player.team.length && player.team[newIdx].hp > 0) {
        player.activeIndex = newIdx;
        const newMon = player.team[newIdx];
        turnLogs.push(`[Switch] @${player.username} เรียกสลับตัว! ส่ง ${newMon.nickname} ลงสนาม!`);
        actionSequence.push({ type: 'ACTION_SWITCH', actor: isP1 ? 'user' : 'opponent', monName: newMon.nickname, newIndex: newIdx });
      }
    }
  }

  // 2. Process Mega Evolution
  for (const [player, isP1] of [[p1, true], [p2, false]]) {
    const userMon = player.team[player.activeIndex];
    if (player.action?.action === 'attack' && player.action.megaEvolve && !player.megaUsed && !userMon.isMega) {
      const megaProfile = getValidMegaProfile(userMon.name, userMon.held_item_name);
      if (megaProfile) {
        userMon.isMega = true;
        userMon.name = megaProfile.name;
        userMon.types = megaProfile.types;
        userMon.sprite = megaProfile.sprite;
        userMon.artwork = megaProfile.artwork;
        userMon.stats.attack = Math.round((userMon.stats.attack || 80) * (megaProfile.statBoost.attack || 1.3));
        userMon.stats.special_attack = Math.round((userMon.stats.special_attack || 80) * (megaProfile.statBoost.special_attack || 1.3));
        userMon.stats.defense = Math.round((userMon.stats.defense || 70) * (megaProfile.statBoost.defense || 1.2));
        userMon.stats.special_defense = Math.round((userMon.stats.special_defense || 70) * (megaProfile.statBoost.special_defense || 1.2));
        userMon.stats.speed = Math.round((userMon.stats.speed || 80) * (megaProfile.statBoost.speed || 1.2));
        player.megaUsed = true;
        turnLogs.push(`[MEGA] MEGA EVOLUTION! @${player.username} ปลุกพลัง ${userMon.nickname} กลายเป็น 【${megaProfile.name}】!`);
        actionSequence.push({ type: 'ACTION_MEGA', actor: isP1 ? 'user' : 'opponent', monName: megaProfile.name, sprite: megaProfile.sprite });
      }
    }
  }

  // 3. Process Attacks with Speed Priority
  const p1Mon = p1.team[p1.activeIndex];
  const p2Mon = p2.team[p2.activeIndex];

  const p1Attacking = p1.action?.action === 'attack' && p1Mon.hp > 0;
  const p2Attacking = p2.action?.action === 'attack' && p2Mon.hp > 0;

  if (p1Attacking || p2Attacking) {
    const p1Speed = p1Mon.stats?.speed || 80;
    const p2Speed = p2Mon.stats?.speed || 80;
    const p1First = p1Speed > p2Speed || (p1Speed === p2Speed && Math.random() < 0.5);

    const attackers = p1First
      ? [{ p: p1, opp: p2, mon: p1Mon, oppMon: p2Mon, isP1: true, isAttacking: p1Attacking },
         { p: p2, opp: p1, mon: p2Mon, oppMon: p1Mon, isP1: false, isAttacking: p2Attacking }]
      : [{ p: p2, opp: p1, mon: p2Mon, oppMon: p1Mon, isP1: false, isAttacking: p2Attacking },
         { p: p1, opp: p2, mon: p1Mon, oppMon: p2Mon, isP1: true, isAttacking: p1Attacking }];

    for (const atk of attackers) {
      if (!atk.isAttacking || atk.mon.hp <= 0 || atk.oppMon.hp <= 0) continue;

      const moveIdx = atk.p.action.moveIndex || 0;
      const move = atk.mon.moves[moveIdx] || atk.mon.moves[0] || { name: 'Tackle', power: 40, type: 'normal' };

      const result = calculateAttack(atk.mon, atk.oppMon, move);
      atk.oppMon.hp = Math.max(0, atk.oppMon.hp - result.damage);

      turnLogs.push(`[Attack] @${atk.p.username}'s ${atk.mon.nickname} ใช้ท่า ${result.moveName}!`);
      turnLogs.push(...result.logs);

      actionSequence.push({
        type: 'ACTION_ATTACK',
        actor: atk.isP1 ? 'user' : 'opponent',
        attackerName: atk.mon.nickname,
        defenderName: atk.oppMon.nickname,
        moveName: result.moveName,
        fxType: result.fxType,
        damage: result.damage,
        isCrit: result.isCrit,
        typeMult: result.typeMult
      });

      if (atk.oppMon.hp <= 0) {
        turnLogs.push(`[Faint] ${atk.oppMon.nickname} ของ @${atk.opp.username} หมดสติแล้ว!`);
        actionSequence.push({
          type: 'ACTION_FAINT',
          actor: atk.isP1 ? 'opponent' : 'user',
          monName: atk.oppMon.nickname
        });

        const nextIdx = atk.opp.team.findIndex(p => p.hp > 0);
        if (nextIdx !== -1) {
          atk.opp.activeIndex = nextIdx;
          const nextMon = atk.opp.team[nextIdx];
          turnLogs.push(`[Switch] @${atk.opp.username} ส่ง ${nextMon.nickname} ลงสนามต่อสู้!`);
          actionSequence.push({
            type: 'ACTION_SWITCH',
            actor: atk.isP1 ? 'opponent' : 'user',
            monName: nextMon.nickname,
            newIndex: nextIdx
          });
        }
      }
    }
  }

  // 4. End of turn Leftovers
  for (const [p, isP1] of [[p1, true], [p2, false]]) {
    const mon = p.team[p.activeIndex];
    if (mon.held_item_name?.toLowerCase().includes('leftovers') && mon.hp > 0 && mon.hp < mon.maxHp) {
      const healAmt = Math.max(1, Math.round(mon.maxHp / 16));
      mon.hp = Math.min(mon.maxHp, mon.hp + healAmt);
      turnLogs.push(`[Held Item] Leftovers ทำงาน! ${mon.nickname} ฟื้นฟู +${healAmt} HP`);
      actionSequence.push({ type: 'ACTION_LEFTOVERS', actor: isP1 ? 'user' : 'opponent', healAmount: healAmt });
    }
  }

  // 5. Check Battle End Conditions
  const p1AllDead = p1.team.every(p => p.hp <= 0);
  const p2AllDead = p2.team.every(p => p.hp <= 0);

  if (p1AllDead || p2AllDead) {
    room.status = 'FINISHED';
    const winner = p1AllDead ? p2 : p1;
    const loser = p1AllDead ? p1 : p2;
    room.winner = winner.username;

    turnLogs.push(`[Victory] ผู้ชนะการแข่งขัน PvP ได้แก่ @${winner.username}!`);
    turnLogs.push(`[Prize] ได้รับเงินรางวัลเดิมพันทั้งหมด ${room.prizePool.toLocaleString()} FUKU!`);
    actionSequence.push({ type: 'ACTION_VICTORY', winner: winner.username, prize: room.prizePool });

    await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [room.prizePool, winner.userId]);

    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'VICTORY', $3, $4)`,
      [winner.userId, `PvP vs @${loser.username}`, room.prizePool, JSON.stringify(room.logs.concat(turnLogs))]
    );
    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'DEFEAT', 0, $3)`,
      [loser.userId, `PvP vs @${winner.username}`, JSON.stringify(room.logs.concat(turnLogs))]
    );

    pushActivity(
      'pvp_victory',
      winner.username,
      winner.avatar,
      `คว้าชัยชนะ PvP เหนือ @${loser.username} กวาดเงินเดิมพันรวม ${room.prizePool.toLocaleString()} FUKU!`
    );
  } else {
    room.turn += 1;
  }
}

// Submit action in shared multiplayer room
router.post('/room/:roomId/action', authMiddleware, async (req, res) => {
  const room = pvpRooms.get(req.params.roomId);
  if (!room || room.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'การต่อสู้ในห้องนี้สิ้นสุดลงแล้วหรือไม่พบห้อง' });
  }

  const userId = req.user.id;
  const isP1 = room.p1.userId === userId;
  const isP2 = room.p2.userId === userId;

  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'คุณไม่ได้อยู่ในห้องประลองนี้' });
  }

  const myPlayer = isP1 ? room.p1 : room.p2;
  const oppPlayer = isP1 ? room.p2 : room.p1;

  if (myPlayer.hasActed) {
    return res.status(400).json({ error: 'คุณได้ส่งคำสั่งสำหรับเทิร์นนี้ไปแล้ว กำลังรอคู่ต่อสู้' });
  }

  const { action, moveIndex, switchIndex, itemId, targetIndex, megaEvolve, zMove, dynamax } = req.body;
  myPlayer.action = { action, moveIndex, switchIndex, itemId, targetIndex, megaEvolve, zMove, dynamax };
  myPlayer.hasActed = true;

  if (!oppPlayer.hasActed) {
    return res.json({
      waitingForOpponent: true,
      message: 'บันทึกคำสั่งแล้ว รอคู่ต่อสู้เลือกคำสั่ง...',
      hasActed: true
    });
  }

  // Both players have acted! Resolve turn:
  const turnLogs = [`--- เทิร์นที่ ${room.turn} ---`];
  const actionSequence = [];

  await resolveMultiplayerTurn(room, turnLogs, actionSequence);

  room.turnLogs = turnLogs;
  room.logs.push(...turnLogs);
  room.lastActionSequence = actionSequence;
  room.p1.hasActed = false;
  room.p1.action = null;
  room.p2.hasActed = false;
  room.p2.action = null;

  res.json({
    success: true,
    turnResolved: true,
    turnLogs,
    actionSequence,
    status: room.status,
    winner: room.winner
  });
});

// Surrender in multiplayer room
router.post('/room/:roomId/surrender', authMiddleware, async (req, res) => {
  const room = pvpRooms.get(req.params.roomId);
  if (!room || room.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'ไม่พบห้องประลองนี้หรือการต่อสู้สิ้นสุดแล้ว' });
  }

  const userId = req.user.id;
  const isP1 = room.p1.userId === userId;
  const isP2 = room.p2.userId === userId;

  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'คุณไม่ได้อยู่ในห้องประลองนี้' });
  }

  const surrenderingPlayer = isP1 ? room.p1 : room.p2;
  const winner = isP1 ? room.p2 : room.p1;

  room.status = 'FINISHED';
  room.winner = winner.username;

  const surrenderLogs = [
    `[Surrender] @${surrenderingPlayer.username} ขอยอมแพ้การแข่งขัน!`,
    `[Victory] ชัยชนะตกเป็นของ @${winner.username}! ได้รับเงินรางวัลเดิมพัน ${room.prizePool.toLocaleString()} FUKU`
  ];
  room.logs.push(...surrenderLogs);
  room.turnLogs = surrenderLogs;
  room.lastActionSequence = [{ type: 'ACTION_VICTORY', winner: winner.username, prize: room.prizePool }];

  await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [room.prizePool, winner.userId]);

  await db.query(
    `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
     VALUES ($1, $2, 'VICTORY', $3, $4)`,
    [winner.userId, `PvP vs @${surrenderingPlayer.username} (Surrender)`, room.prizePool, JSON.stringify(room.logs)]
  );

  res.json({ success: true, message: 'ขอยอมแพ้เรียบร้อยแล้ว' });
});

// ==========================================
// 5. SINGLE-PLAYER BOT BATTLE ACTIONS (Backward Compatibility)
// ==========================================
router.post('/action', authMiddleware, async (req, res) => {
  const { action, moveIndex, switchIndex, itemId, targetIndex, megaEvolve, zMove, dynamax } = req.body;
  const userId = req.user.id;

  const battle = activePvpBattles.get(userId);
  if (!battle || battle.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'ไม่พบการต่อสู้ PvP ที่กำลังดำเนินอยู่' });
  }

  const userMon = battle.userTeam[battle.userActiveIndex];
  const oppMon = battle.opponentTeam[battle.opponentActiveIndex];
  const turnLogs = [`--- เทิร์นที่ ${battle.turn} ---`];
  const actionSequence = [];

  // ACTION: USE ITEM
  if (action === 'use_item') {
    if (!itemId) return res.status(400).json({ error: 'กรุณาระบุไอเท็มที่ต้องการใช้' });

    const itemRes = await db.query(
      `SELECT ui.*, i.name, i.code, i.effect_type, i.effect_value 
       FROM user_items ui 
       JOIN items i ON ui.item_id = i.id 
       WHERE ui.item_id = $1 AND ui.user_id = $2 AND ui.quantity > 0`,
      [itemId, userId]
    );
    if (itemRes.rows.length === 0) return res.status(400).json({ error: 'คุณไม่มีไอเท็มนี้ในกระเป๋า' });
    const item = itemRes.rows[0];

    const targetIdx = (targetIndex !== undefined && targetIndex >= 0 && targetIndex < battle.userTeam.length)
      ? targetIndex 
      : battle.userActiveIndex;
    const targetMon = battle.userTeam[targetIdx];

    let itemUsedSuccess = false;
    let effectMessage = '';

    if (item.effect_type === 'HEAL_HP') {
      if (targetMon.hp <= 0) return res.status(400).json({ error: `${targetMon.nickname} หมดสติอยู่ ต้องใช้ Revive` });
      if (targetMon.hp >= targetMon.maxHp) return res.status(400).json({ error: `${targetMon.nickname} พลังชีวิตเต็มอยู่แล้ว` });
      const healAmount = Math.min(targetMon.maxHp - targetMon.hp, Math.round(parseFloat(item.effect_value)));
      targetMon.hp += healAmount;
      effectMessage = `💚 คุณใช้ ${item.name} กับ ${targetMon.nickname}! ฟื้นฟู HP +${healAmount} หน่วย (${targetMon.hp}/${targetMon.maxHp})`;
      actionSequence.push({ type: 'ACTION_ITEM', actor: 'user', itemName: item.name, target: targetMon.nickname, healAmount, targetIndex: targetIdx });
      itemUsedSuccess = true;
    } else if (item.effect_type === 'REVIVE') {
      if (targetMon.hp > 0) return res.status(400).json({ error: `${targetMon.nickname} ยังไม่หมดสติ` });
      const healAmount = Math.round(targetMon.maxHp * (parseFloat(item.effect_value) / 100));
      targetMon.hp = healAmount;
      effectMessage = `✨ คุณใช้ ${item.name}! ชุบชีวิต ${targetMon.nickname} ฟื้นคืนสู่สนามด้วย HP ${healAmount} หน่วย!`;
      actionSequence.push({ type: 'ACTION_ITEM', actor: 'user', itemName: item.name, target: targetMon.nickname, healAmount, targetIndex: targetIdx });
      itemUsedSuccess = true;
    } else if (item.effect_type === 'BOOST_ATK') {
      targetMon.stats.attack = Math.round((targetMon.stats.attack || 80) * 1.5);
      effectMessage = `⚔️ คุณใช้ ${item.name}! พลังโจมตีของ ${targetMon.nickname} เพิ่มขึ้น 50%!`;
      actionSequence.push({ type: 'ACTION_ITEM', actor: 'user', itemName: item.name, target: targetMon.nickname, healAmount: 0, targetIndex: targetIdx });
      itemUsedSuccess = true;
    }

    if (itemUsedSuccess) {
      await db.query(`UPDATE user_items SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2`, [userId, itemId]);
      turnLogs.push(effectMessage);

      const oppMove = pickBotMove(oppMon, userMon);
      const oppResult = calculateAttack(oppMon, userMon, oppMove);
      userMon.hp = Math.max(0, userMon.hp - oppResult.damage);
      turnLogs.push(...oppResult.logs);
      actionSequence.push({
        type: 'ACTION_ATTACK',
        actor: 'opponent',
        attackerName: oppMon.name,
        defenderName: userMon.nickname,
        moveName: oppResult.moveName,
        fxType: oppResult.fxType,
        damage: oppResult.damage,
        isCrit: oppResult.isCrit,
        typeMult: oppResult.typeMult
      });

      if (userMon.hp <= 0) {
        turnLogs.push(`💀 ${userMon.nickname} ของคุณหมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
      }
    }
  } else if (action === 'switch') {
    if (switchIndex === undefined || switchIndex === battle.userActiveIndex || !battle.userTeam[switchIndex]) {
      return res.status(400).json({ error: 'ตำแหน่งโปเกมอนที่จะสลับไม่ถูกต้อง' });
    }
    const newMon = battle.userTeam[switchIndex];
    if (newMon.hp <= 0) {
      return res.status(400).json({ error: 'โปเกมอนตัวนี้หมดสติแล้ว' });
    }

    turnLogs.push(`🔄 คุณเรียก ${userMon.nickname} กลับมา แล้วส่ง ${newMon.nickname} ลงสนาม!`);
    actionSequence.push({ type: 'ACTION_SWITCH', actor: 'user', monName: newMon.nickname, newIndex: switchIndex });
    battle.userActiveIndex = switchIndex;
    const switchedMon = battle.userTeam[switchIndex];

    const oppMove = pickBotMove(oppMon, switchedMon);
    const oppResult = calculateAttack(oppMon, switchedMon, oppMove);
    switchedMon.hp = Math.max(0, switchedMon.hp - oppResult.damage);
    turnLogs.push(...oppResult.logs);
    actionSequence.push({
      type: 'ACTION_ATTACK',
      actor: 'opponent',
      attackerName: oppMon.name,
      defenderName: switchedMon.nickname,
      moveName: oppResult.moveName,
      fxType: oppResult.fxType,
      damage: oppResult.damage,
      isCrit: oppResult.isCrit,
      typeMult: oppResult.typeMult
    });

    if (switchedMon.hp <= 0) {
      turnLogs.push(`💀 ${switchedMon.nickname} หมดสติแล้ว!`);
      actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: switchedMon.nickname });
    }
  } else if (action === 'attack') {
    const userMove = userMon.moves[moveIndex];
    if (!userMove) {
      return res.status(400).json({ error: 'ไม่พบสกิลที่เลือก' });
    }

    // Mega Evolution check
    if (megaEvolve && !battle.userMegaUsed && !userMon.isMega) {
      const megaProfile = getValidMegaProfile(userMon.name, userMon.held_item_name);
      if (megaProfile) {
        userMon.isMega = true;
        userMon.name = megaProfile.name;
        userMon.types = megaProfile.types;
        userMon.sprite = megaProfile.sprite;
        userMon.artwork = megaProfile.artwork;
        userMon.stats.attack = Math.round((userMon.stats.attack || 80) * (megaProfile.statBoost.attack || 1.3));
        userMon.stats.special_attack = Math.round((userMon.stats.special_attack || 80) * (megaProfile.statBoost.special_attack || 1.3));
        userMon.stats.defense = Math.round((userMon.stats.defense || 70) * (megaProfile.statBoost.defense || 1.2));
        userMon.stats.special_defense = Math.round((userMon.stats.special_defense || 70) * (megaProfile.statBoost.special_defense || 1.2));
        userMon.stats.speed = Math.round((userMon.stats.speed || 80) * (megaProfile.statBoost.speed || 1.2));

        battle.userMegaUsed = true;
        turnLogs.push(`🧬✨ MEGA EVOLUTION! แสงสายรุ้งประกายล้อมรอบ ${userMon.nickname} แปลงร่างเป็น 【${megaProfile.name}】!!`);
        actionSequence.push({
          type: 'ACTION_MEGA',
          actor: 'user',
          monName: megaProfile.name,
          sprite: megaProfile.sprite,
          artwork: megaProfile.artwork
        });
      }
    }

    // Z-Move check
    const validZMove = zMove ? getValidZMove(userMon, userMon.held_item_name) : null;
    const useZMove = Boolean(validZMove && !battle.userZMoveUsed);
    if (useZMove) {
      battle.userZMoveUsed = true;
      actionSequence.push({ type: 'ACTION_Z_CHARGE', actor: 'user', monName: userMon.nickname });
      turnLogs.push(`⚡💥 Z-POWER CHARGED! ${userMon.nickname} ปลดปล่อยท่าไม้ตาย Z-Move!`);
    }

    // Dynamax check
    let useDynamax = false;
    if (dynamax && !battle.userDynamaxUsed && !userMon.isDynamax) {
      const bandRes = await db.query(
        `SELECT ui.quantity FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = $1 AND i.code = 'dynamax_band' AND ui.quantity > 0`,
        [userId]
      );
      if (bandRes.rows.length > 0) {
        battle.userDynamaxUsed = true;
        userMon.isDynamax = true;
        userMon.dynamaxTurns = 3;
        userMon.maxHp = userMon.baseMaxHp * 2;
        userMon.hp = userMon.hp * 2;
        useDynamax = true;
        turnLogs.push(`🔴 DYNAMAX! สายเมฆสีแดงหมุนวนรอบ ${userMon.nickname} ขยายร่างยักษ์พร้อม HP เพิ่มขึ้นเป็น 2 เท่า (3 เทิร์น)!`);
        actionSequence.push({ type: 'ACTION_DYNAMAX', actor: 'user', monName: userMon.nickname });
      }
    }

    const oppMove = pickBotMove(oppMon, userMon);
    const userSpeed = userMon.stats.speed || 80;
    const oppSpeed = oppMon.stats.speed || 80;
    const userFirst = userSpeed >= oppSpeed;

    const executeUserAttack = () => {
      let moveName = userMove.name;
      let power = userMove.power || 60;
      let type = userMove.type || 'normal';

      if (useZMove && validZMove) {
        moveName = validZMove.zMoveName;
        power = validZMove.power;
        type = validZMove.type;
      } else if (userMon.isDynamax) {
        moveName = `Max ${moveName}`;
        power = Math.round(power * 1.3);
      }

      const moveObj = { ...userMove, name: moveName, power, type };
      const result = calculateAttack(userMon, oppMon, moveObj);
      oppMon.hp = Math.max(0, oppMon.hp - result.damage);
      turnLogs.push(...result.logs);
      actionSequence.push({
        type: 'ACTION_ATTACK',
        actor: 'user',
        attackerName: userMon.nickname,
        defenderName: oppMon.name,
        moveName: result.moveName,
        fxType: result.fxType,
        damage: result.damage,
        isCrit: result.isCrit,
        typeMult: result.typeMult,
        isMega: userMon.isMega,
        isZMove: useZMove,
        isDynamax: userMon.isDynamax
      });
    };

    const executeOppAttack = () => {
      const oppResult = calculateAttack(oppMon, userMon, oppMove);
      userMon.hp = Math.max(0, userMon.hp - oppResult.damage);
      turnLogs.push(...oppResult.logs);
      actionSequence.push({
        type: 'ACTION_ATTACK',
        actor: 'opponent',
        attackerName: oppMon.name,
        defenderName: userMon.nickname,
        moveName: oppResult.moveName,
        fxType: oppResult.fxType,
        damage: oppResult.damage,
        isCrit: oppResult.isCrit,
        typeMult: oppResult.typeMult
      });
    };

    if (userFirst) {
      executeUserAttack();
      if (oppMon.hp <= 0) {
        turnLogs.push(`💥 ${oppMon.name} ของ ${battle.opponentName} หมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'opponent', monName: oppMon.name });
        const nextOppIndex = battle.opponentTeam.findIndex((p, idx) => idx > battle.opponentActiveIndex && p.hp > 0);
        if (nextOppIndex !== -1) {
          battle.opponentActiveIndex = nextOppIndex;
          const nextOpp = battle.opponentTeam[nextOppIndex];
          turnLogs.push(`⚡ ${battle.opponentName} ส่ง ${nextOpp.name} ลงสู่สนาม!`);
          actionSequence.push({ type: 'ACTION_SWITCH', actor: 'opponent', monName: nextOpp.name, newIndex: nextOppIndex });
        }
      } else {
        executeOppAttack();
        if (userMon.hp <= 0) {
          turnLogs.push(`💀 ${userMon.nickname} ของคุณหมดสติแล้ว!`);
          actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
        }
      }
    } else {
      executeOppAttack();
      if (userMon.hp <= 0) {
        turnLogs.push(`💀 ${userMon.nickname} ของคุณหมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
      } else {
        executeUserAttack();
        if (oppMon.hp <= 0) {
          turnLogs.push(`💥 ${oppMon.name} ของ ${battle.opponentName} หมดสติแล้ว!`);
          actionSequence.push({ type: 'ACTION_FAINT', actor: 'opponent', monName: oppMon.name });
          const nextOppIndex = battle.opponentTeam.findIndex((p, idx) => idx > battle.opponentActiveIndex && p.hp > 0);
          if (nextOppIndex !== -1) {
            battle.opponentActiveIndex = nextOppIndex;
            const nextOpp = battle.opponentTeam[nextOppIndex];
            turnLogs.push(`⚡ ${battle.opponentName} ส่ง ${nextOpp.name} ลงสู่สนาม!`);
            actionSequence.push({ type: 'ACTION_SWITCH', actor: 'opponent', monName: nextOpp.name, newIndex: nextOppIndex });
          }
        }
      }
    }

    // Leftovers check
    if (userMon.held_item_name?.toLowerCase().includes('leftovers') && userMon.hp > 0 && userMon.hp < userMon.maxHp) {
      const healAmt = Math.max(1, Math.round(userMon.maxHp / 16));
      userMon.hp = Math.min(userMon.maxHp, userMon.hp + healAmt);
      turnLogs.push(`🍎 Leftovers ทำงาน! ${userMon.nickname} ฟื้นฟู HP +${healAmt} หน่วย`);
      actionSequence.push({ type: 'ACTION_LEFTOVERS', actor: 'user', healAmount: healAmt });
    }

    // Dynamax turn countdown
    if (userMon.isDynamax) {
      userMon.dynamaxTurns -= 1;
      if (userMon.dynamaxTurns <= 0) {
        userMon.isDynamax = false;
        userMon.maxHp = userMon.baseMaxHp;
        userMon.hp = Math.min(userMon.maxHp, Math.ceil(userMon.hp / 2));
        turnLogs.push(`💨 พลัง Dynamax ของ ${userMon.nickname} หมดลงแล้ว คืนสู่ขนาดปกติ`);
        actionSequence.push({ type: 'ACTION_DYNAMAX_END', actor: 'user', monName: userMon.nickname });
      }
    }
  }

  // End conditions
  const allOpponentFainted = battle.opponentTeam.every(p => p.hp <= 0);
  const allUserFainted = battle.userTeam.every(p => p.hp <= 0);

  if (allOpponentFainted) {
    battle.status = 'VICTORY';
    turnLogs.push(`🏆 คุณชนะการประลอง PvP กับ ${battle.opponentName}! ได้รับเงินเดิมพันรวม ${battle.prizePool.toLocaleString()} FUKU!`);
    actionSequence.push({ type: 'ACTION_VICTORY', prize: battle.prizePool });

    await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [battle.prizePool, userId]);
    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'VICTORY', $3, $4)`,
      [userId, `PvP: ${battle.opponentName}`, battle.prizePool, JSON.stringify(battle.logs.concat(turnLogs))]
    );

    pushActivity(
      'pvp_victory',
      req.user.username,
      'https://play.pokemonshowdown.com/sprites/trainers/red.png',
      `ชนะการแข่งขัน PvP เหนือ ${battle.opponentName} กวาดเงินเดิมพัน ${battle.prizePool.toLocaleString()} FUKU!`
    );
  } else if (allUserFainted) {
    battle.status = 'DEFEAT';
    turnLogs.push(`❌ โปเกมอนทั้งหมดของคุณหมดสติ... คุณแพ้การแข่งขัน PvP และเสียเงินเดิมพัน ${battle.wager.toLocaleString()} FUKU`);
    actionSequence.push({ type: 'ACTION_DEFEAT' });

    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'DEFEAT', 0, $3)`,
      [userId, `PvP: ${battle.opponentName}`, JSON.stringify(battle.logs.concat(turnLogs))]
    );

    pushActivity(
      'pvp_victory',
      battle.opponentUsername,
      battle.opponentAvatar,
      `เอาชนะ ${req.user.username} ในสนาม PvP คว้าเงินรางวัล ${battle.prizePool.toLocaleString()} FUKU!`
    );
  } else if (userMon.hp <= 0) {
    const nextAlive = battle.userTeam.findIndex(p => p.hp > 0);
    if (nextAlive !== -1) {
      battle.userActiveIndex = nextAlive;
      turnLogs.push(`🔄 ส่ง ${battle.userTeam[nextAlive].nickname} ออกมาสู้แทน!`);
      actionSequence.push({ type: 'ACTION_SWITCH', actor: 'user', monName: battle.userTeam[nextAlive].nickname, newIndex: nextAlive });
    }
  }

  battle.turn += 1;
  battle.logs.push(...turnLogs);

  res.json({
    battle,
    turnLogs,
    actionSequence
  });
});

module.exports = router;

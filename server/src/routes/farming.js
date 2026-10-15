const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { calculateAttack } = require('../services/battleEngine');

const router = express.Router();

// Pool of wild encounter Pokémon for quick expedition farming
const WILD_ENCOUNTERS = [
  {
    name: 'Pidgey (ป๊อปโปะ)',
    types: ['normal', 'flying'],
    hp: 40,
    maxHp: 40,
    stats: { attack: 45, defense: 40, special_attack: 35, special_defense: 35, speed: 56 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/16.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/16.png',
    moves: [{ name: 'Gust', type: 'flying', power: 40 }, { name: 'Tackle', type: 'normal', power: 35 }],
    rewardMin: 600,
    rewardMax: 900
  },
  {
    name: 'Rattata (โครัตตะ)',
    types: ['normal'],
    hp: 35,
    maxHp: 35,
    stats: { attack: 56, defense: 35, special_attack: 25, special_defense: 35, speed: 72 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/19.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/19.png',
    moves: [{ name: 'Quick Attack', type: 'normal', power: 40 }, { name: 'Bite', type: 'dark', power: 40 }],
    rewardMin: 650,
    rewardMax: 950
  },
  {
    name: 'Oddish (นาโซโนะคุสะ)',
    types: ['grass', 'poison'],
    hp: 45,
    maxHp: 45,
    stats: { attack: 50, defense: 55, special_attack: 75, special_defense: 65, speed: 30 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/43.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/43.png',
    moves: [{ name: 'Absorb', type: 'grass', power: 35 }, { name: 'Acid', type: 'poison', power: 40 }],
    rewardMin: 700,
    rewardMax: 1000
  },
  {
    name: 'Meowth (เนียส)',
    types: ['normal'],
    hp: 40,
    maxHp: 40,
    stats: { attack: 45, defense: 35, special_attack: 40, special_defense: 40, speed: 90 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/52.png',
    moves: [{ name: 'Pay Day (เหรียญนำโชค)', type: 'normal', power: 40 }, { name: 'Scratch', type: 'normal', power: 40 }],
    rewardMin: 800,
    rewardMax: 1200 // Bonus coins from Pay Day!
  },
  {
    name: 'Poliwag (เนียวโรโมะ)',
    types: ['water'],
    hp: 40,
    maxHp: 40,
    stats: { attack: 50, defense: 40, special_attack: 40, special_defense: 40, speed: 70 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/60.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/60.png',
    moves: [{ name: 'Water Gun', type: 'water', power: 40 }, { name: 'Bubble', type: 'water', power: 40 }],
    rewardMin: 700,
    rewardMax: 1000
  },
  {
    name: 'Zubat (ซูแบท)',
    types: ['poison', 'flying'],
    hp: 40,
    maxHp: 40,
    stats: { attack: 45, defense: 35, special_attack: 30, special_defense: 40, speed: 55 },
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/41.png',
    artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/41.png',
    moves: [{ name: 'Leech Life', type: 'bug', power: 35 }, { name: 'Poison Sting', type: 'poison', power: 35 }],
    rewardMin: 650,
    rewardMax: 950
  }
];

// Helper: Ensure user farming row exists
async function getOrCreateUserFarming(userId) {
  let res = await db.query('SELECT * FROM user_farming WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) {
    res = await db.query(
      `INSERT INTO user_farming (user_id, last_faucet_at, wild_battles_won, quests_claimed)
       VALUES ($1, NULL, 0, '[]'::jsonb)
       RETURNING *`,
      [userId]
    );
  }
  return res.rows[0];
}

// 1. Get Farming Status & Quests
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const farming = await getOrCreateUserFarming(userId);
    const userRes = await db.query('SELECT fuku_balance FROM users WHERE id = $1', [userId]);
    const balance = userRes.rows[0]?.fuku_balance || 0;

    let wildBattleAvailable = true;
    let wildBattleSecondsRemaining = 0;
    if (farming.last_wild_battle_at) {
      const elapsed = Date.now() - new Date(farming.last_wild_battle_at).getTime();
      const wildBattleCooldown = 60 * 1000;
      if (elapsed < wildBattleCooldown) {
        wildBattleAvailable = false;
        wildBattleSecondsRemaining = Math.ceil((wildBattleCooldown - elapsed) / 1000);
      }
    }

    // Check Faucet 24h cooldown
    let faucetAvailable = true;
    let faucetSecondsRemaining = 0;
    if (farming.last_faucet_at) {
      const elapsed = Date.now() - new Date(farming.last_faucet_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (elapsed < twentyFourHours) {
        faucetAvailable = false;
        faucetSecondsRemaining = Math.ceil((twentyFourHours - elapsed) / 1000);
      }
    }

    // Check Daily Quests Progress
    const battleRecords = await db.query(
      `SELECT count(*) as gym_count FROM battle_records WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [userId]
    );
    const gymCount = parseInt(battleRecords.rows[0]?.gym_count || 0, 10);

    const claimedQuests = Array.isArray(farming.quests_claimed) 
      ? farming.quests_claimed 
      : JSON.parse(farming.quests_claimed || '[]');

    const quests = [
      {
        id: 'daily_faucet',
        title: 'รับเงินสนับสนุนเทรนเนอร์ประจำวัน (Daily Faucet)',
        reward: 3000,
        progress: faucetAvailable ? 0 : 1,
        target: 1,
        completed: !faucetAvailable,
        claimed: !faucetAvailable,
        hint: 'กดรับได้ฟรีวันละ 1 ครั้ง (+3,000 FUKU)'
      },
      {
        id: 'wild_hunt',
        title: 'ออกสำรวจทุ่งหญ้า Wild Battle ครบ 3 ครั้ง',
        reward: 1500,
        progress: Math.min(3, farming.wild_battles_won || 0),
        target: 3,
        completed: (farming.wild_battles_won || 0) >= 3,
        claimed: claimedQuests.includes('wild_hunt'),
        hint: 'ฟาร์มเงินจากมอนสเตอร์ป่าอย่างต่อเนื่อง'
      },
      {
        id: 'gym_challenge',
        title: 'ประลองกับ Gym Leader 1 ครั้ง',
        reward: 2000,
        progress: Math.min(1, gymCount),
        target: 1,
        completed: gymCount >= 1,
        claimed: claimedQuests.includes('gym_challenge'),
        hint: 'ท้าดวลยิม Brock หรือผู้นำยิมคนใดก็ได้'
      }
    ];

    res.json({
      fuku_balance: balance,
      faucet: {
        available: faucetAvailable,
        reward: 3000,
        seconds_remaining: faucetSecondsRemaining,
        last_claimed_at: farming.last_faucet_at
      },
      wild_battles_won: farming.wild_battles_won || 0,
      wild_battle: {
        available: wildBattleAvailable,
        seconds_remaining: wildBattleSecondsRemaining,
        last_battled_at: farming.last_wild_battle_at
      },
      quests
    });
  } catch (err) {
    console.error('Error in farming status:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดระบบฟาร์มเงิน' });
  }
});

// 2. Claim Daily Faucet (+3,000 FUKU)
router.post('/daily-faucet', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const farming = await getOrCreateUserFarming(userId);

    if (farming.last_faucet_at) {
      const elapsed = Date.now() - new Date(farming.last_faucet_at).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (elapsed < twentyFourHours) {
        const remainingMinutes = Math.ceil((twentyFourHours - elapsed) / (60 * 1000));
        return res.status(400).json({
          error: `คุณกดรับเงินสนับสนุนประจำวันไปแล้ว กรุณารออีก ${Math.floor(remainingMinutes / 60)} ชม. ${remainingMinutes % 60} นาที`
        });
      }
    }

    const FAUCET_REWARD = 3000;

    // Credit user balance
    const userRes = await db.query(
      `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2 RETURNING fuku_balance`,
      [FAUCET_REWARD, userId]
    );

    // Update farming timestamp
    await db.query(
      `UPDATE user_farming SET last_faucet_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: `🎉 รับเงินสนับสนุนเทรนเนอร์สำเร็จ! +${FAUCET_REWARD.toLocaleString()} FUKU`,
      reward: FAUCET_REWARD,
      new_balance: userRes.rows[0].fuku_balance
    });
  } catch (err) {
    console.error('Error claiming faucet:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรับเงินสนับสนุน' });
  }
});

// 3. Quick Wild Battle Expedition (Free repeatable farming)
router.post('/wild-battle', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const farming = await getOrCreateUserFarming(userId);
    if (farming.last_wild_battle_at) {
      const elapsed = Date.now() - new Date(farming.last_wild_battle_at).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsed < cooldownMs) {
        const secondsRemaining = Math.ceil((cooldownMs - elapsed) / 1000);
        return res.status(429).json({
          error: `กรุณารออีก ${secondsRemaining} วินาทีก่อนออกสำรวจครั้งถัดไป`,
          seconds_remaining: secondsRemaining
        });
      }
    }

    // Get user active pokemon team or first pokemon
    const teamRes = await db.query(
      `SELECT up.*, p.name, p.types, p.sprite_url, p.artwork_url 
       FROM user_pokemons up 
       JOIN pokemons p ON up.pokemon_id = p.id 
       WHERE up.user_id = $1 AND (up.is_in_team = TRUE OR up.is_for_sale = FALSE)
       ORDER BY up.is_in_team DESC, up.id ASC 
       LIMIT 1`,
      [userId]
    );

    if (teamRes.rows.length === 0) {
      return res.status(400).json({ error: 'คุณยังไม่มีโปเกมอนในครอบครอง กรุณาสมัครสมาชิกหรือรับโปเกมอนเริ่มต้น' });
    }

    const userMon = teamRes.rows[0];
    userMon.stats = typeof userMon.stats === 'object' ? userMon.stats : JSON.parse(userMon.stats || '{}');
    userMon.moves = Array.isArray(userMon.moves) ? userMon.moves : JSON.parse(userMon.moves || '[]');

    // Select a random Pokemon from the complete database catalog.
    const wildRows = await db.query('SELECT * FROM pokemons ORDER BY RANDOM() LIMIT 1');
    const wildSource = wildRows.rows[0];
    const wild = wildSource ? {
      name: wildSource.name,
      types: Array.isArray(wildSource.types) ? wildSource.types : JSON.parse(wildSource.types || '[]'),
      hp: Math.max(35, (wildSource.base_stats?.hp || 50) * 2),
      maxHp: Math.max(35, (wildSource.base_stats?.hp || 50) * 2),
      stats: typeof wildSource.base_stats === 'object' ? wildSource.base_stats : JSON.parse(wildSource.base_stats || '{}'),
      sprite: wildSource.sprite_url,
      artwork: wildSource.artwork_url,
      moves: (Array.isArray(wildSource.moves) ? wildSource.moves : JSON.parse(wildSource.moves || '[]')).slice(0, 4),
      rewardMin: Math.max(300, Math.round((wildSource.base_price || 500) * 0.08)),
      rewardMax: Math.max(700, Math.round((wildSource.base_price || 500) * 0.15))
    } : WILD_ENCOUNTERS[Math.floor(Math.random() * WILD_ENCOUNTERS.length)];

    // Simulate fast expedition battle
    const playerMove = userMon.moves[0] || { name: 'Tackle', type: 'normal', power: 50 };
    const wildMove = wild.moves[0];

    const playerAttack = calculateAttack(
      { name: userMon.nickname || userMon.name, stats: userMon.stats },
      wild,
      playerMove
    );

    const logs = [
      `🌿 ออกสำรวจทุ่งหญ้าโปเกมอนป่า... บังเอิญพบ 【${wild.name}】!`,
      `⭐ ${userMon.nickname || userMon.name} ใช้ท่า 【${playerMove.name}】! สร้างความเสียหาย ${playerAttack.damage} หน่วย!`
    ];

    let victory = true;
    let rewardFuku = 0;
    let droppedItem = null;

    if (playerAttack.damage >= wild.hp) {
      logs.push(`💥 ${wild.name} หมดสติลงแล้ว! คุณชนะการต่อสู้อย่างสวยงาม!`);
    } else {
      const wildAttack = calculateAttack(wild, { name: userMon.nickname, stats: userMon.stats }, wildMove);
      logs.push(`⚡ ${wild.name} ตอบโต้ด้วย 【${wildMove.name}】! แต่ไม่สามารถต้านทานได้`);
      logs.push(`💥 ${userMon.nickname || userMon.name} เผด็จศึกสำเร็จ! ได้รับชัยชนะ!`);
    }

    // Calculate Reward FUKU
    rewardFuku = Math.floor(Math.random() * (wild.rewardMax - wild.rewardMin + 1)) + wild.rewardMin;
    logs.push(`💰 ได้รับเงินรางวัลจากการสำรวจ: +${rewardFuku.toLocaleString()} FUKU!`);

    // Chance for item drop (30%)
    if (Math.random() < 0.35) {
      const dropItems = ['potion', 'super_potion', 'revive'];
      const chosenItemCode = dropItems[Math.floor(Math.random() * dropItems.length)];
      const itemRow = await db.query('SELECT * FROM items WHERE code = $1', [chosenItemCode]);

      if (itemRow.rows.length > 0) {
        const item = itemRow.rows[0];
        await db.query(
          `INSERT INTO user_items (user_id, item_id, quantity)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_items.quantity + 1`,
          [userId, item.id]
        );
        droppedItem = { name: item.name, icon_url: item.icon_url };
        logs.push(`🎁 สุ่มดรอปไอเท็มพิเศษ! ได้รับ: 【${item.name}】 x 1 ชิ้น!`);
      }
    }

    // Credit FUKU to user
    const updatedUser = await db.query(
      `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2 RETURNING fuku_balance`,
      [rewardFuku, userId]
    );

    // Update farming stats
    await getOrCreateUserFarming(userId);
    await db.query(
      `UPDATE user_farming 
       SET wild_battles_won = wild_battles_won + 1, last_wild_battle_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      victory: true,
      wildPokemon: wild,
      userPokemon: {
        name: userMon.nickname || userMon.name,
        sprite: userMon.artwork_url || userMon.sprite_url
      },
      rewardFuku,
      droppedItem,
      logs,
      new_balance: updatedUser.rows[0].fuku_balance
    });
  } catch (err) {
    console.error('Error in wild battle farming:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสำรวจทุ่งหญ้า' });
  }
});

// 4. Claim Quest Reward
router.post('/claim-quest', authMiddleware, async (req, res) => {
  try {
    const { questId } = req.body;
    const userId = req.user.id;

    const farming = await getOrCreateUserFarming(userId);
    const claimedQuests = Array.isArray(farming.quests_claimed) 
      ? farming.quests_claimed 
      : JSON.parse(farming.quests_claimed || '[]');

    if (claimedQuests.includes(questId)) {
      return res.status(400).json({ error: 'คุณกดรับรางวัลภารกิจนี้ไปแล้ว' });
    }

    let reward = 0;
    let questName = '';

    if (questId === 'wild_hunt') {
      if ((farming.wild_battles_won || 0) < 3) {
        return res.status(400).json({ error: 'ยังทำภารกิจไม่สำเร็จ (ต้องฟาร์ม Wild Battle ครบ 3 ครั้ง)' });
      }
      reward = 1500;
      questName = 'สำรวจทุ่งหญ้า Wild Battle ครบ 3 ครั้ง';
    } else if (questId === 'gym_challenge') {
      const records = await db.query(
        `SELECT count(*) as gym_count FROM battle_records WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
        [userId]
      );
      if (parseInt(records.rows[0]?.gym_count || 0, 10) < 1) {
        return res.status(400).json({ error: 'ยังทำภารกิจไม่สำเร็จ (ต้องประลอง Gym Leader อย่างน้อย 1 ครั้ง)' });
      }
      reward = 2000;
      questName = 'ประลองกับ Gym Leader 1 ครั้ง';
    } else {
      return res.status(400).json({ error: 'ไม่พบภารกิจที่ระบุ' });
    }

    // Credit user balance
    const userRes = await db.query(
      `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2 RETURNING fuku_balance`,
      [reward, userId]
    );

    // Save claimed quest
    claimedQuests.push(questId);
    await db.query(
      `UPDATE user_farming SET quests_claimed = $1 WHERE user_id = $2`,
      [JSON.stringify(claimedQuests), userId]
    );

    res.json({
      success: true,
      message: `🎉 รับรางวัลภารกิจ "${questName}" สำเร็จ! +${reward.toLocaleString()} FUKU`,
      reward,
      new_balance: userRes.rows[0].fuku_balance
    });
  } catch (err) {
    console.error('Error claiming quest:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรับรางวัลภารกิจ' });
  }
});

module.exports = router;

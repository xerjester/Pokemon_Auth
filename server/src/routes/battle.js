const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { GYM_LEADERS, MEGA_PROFILES, calculateAttack, getValidMegaProfile, getValidZMove } = require('../services/battleEngine');

const router = express.Router();

// In-memory active battle sessions (keyed by userId)
const activeBattles = new Map();

// Get available Gym Leaders
router.get('/gyms', (req, res) => {
  const list = Object.values(GYM_LEADERS).map(g => ({
    id: g.id,
    name: g.name,
    badge: g.badge,
    badgeImage: g.badgeImage,
    reward: g.reward,
    difficulty: g.difficulty,
    avatar: g.avatar,
    hint: g.hint,
    region: g.region || 'kanto',
    pokemonCount: g.pokemon.length,
    pokemonPreview: g.pokemon.map(p => ({
      name: p.name,
      types: p.types,
      sprite: p.sprite
    }))
  }));

  res.json({ gyms: list });
});

// Start a battle against a Gym Leader
router.post('/start', authMiddleware, async (req, res) => {
  const { gymId } = req.body;
  const userId = req.user.id;

  const gym = GYM_LEADERS[gymId];
  if (!gym) {
    return res.status(404).json({ error: 'ไม่พบผู้นำยิมนี้' });
  }

  // Load user's team including held items
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

  if (teamRes.rows.length === 0) {
    return res.status(400).json({ error: 'คุณยังไม่มีโปเกมอนในทีมต่อสู้ กรุณาไปที่หน้าคลังเพื่อจัดทีมก่อน (สูงสุด 3 ตัว)' });
  }

  // Initialize fresh battle state for the user
  const userTeam = teamRes.rows.map(p => ({
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

  // Deep clone Gym Leader pokemon roster
  const opponentTeam = JSON.parse(JSON.stringify(gym.pokemon)).map(p => ({
    ...p,
    baseMaxHp: p.maxHp,
    isMega: false,
    isDynamax: false
  }));

  const battleSession = {
    gymId,
    gymName: gym.name,
    badge: gym.badge,
    reward: gym.reward,
    userTeam,
    userActiveIndex: 0,
    opponentTeam,
    opponentActiveIndex: 0,
    userMegaUsed: false,
    userZMoveUsed: false,
    userDynamaxUsed: false,
    turn: 1,
    status: 'IN_PROGRESS', // 'IN_PROGRESS', 'VICTORY', 'DEFEAT'
    logs: [
      `🏟️ การต่อสู้เริ่มต้นขึ้น! ${gym.name} ส่ง ${opponentTeam[0].name} เข้าสู่สนาม!`,
      `⭐ คุณส่ง ${userTeam[0].nickname} ออกไปสู้!`
    ]
  };

  activeBattles.set(userId, battleSession);

  res.json({
    message: 'เข้าสู่สนามประลองแล้ว!',
    battle: battleSession
  });
});

// Execute turn action (attack, switch, use_item)
router.post('/action', authMiddleware, async (req, res) => {
  const { action, moveIndex, switchIndex, itemId, targetIndex, megaEvolve, zMove, dynamax } = req.body;
  const userId = req.user.id;

  const battle = activeBattles.get(userId);
  if (!battle || battle.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'ไม่พบการต่อสู้ที่กำลังดำเนินอยู่ กรุณาเริ่มใหม่อีกครั้ง' });
  }

  const userMon = battle.userTeam[battle.userActiveIndex];
  const oppMon = battle.opponentTeam[battle.opponentActiveIndex];
  const turnLogs = [`--- เทิร์นที่ ${battle.turn} ---`];
  const actionSequence = [];

  // ==========================================
  // ACTION: USE ITEM IN BATTLE
  // ==========================================
  if (action === 'use_item') {
    if (!itemId) {
      return res.status(400).json({ error: 'กรุณาระบุไอเท็มที่ต้องการใช้' });
    }

    // Check user owned items
    const itemRes = await db.query(
      `SELECT ui.*, i.name, i.code, i.effect_type, i.effect_value 
       FROM user_items ui 
       JOIN items i ON ui.item_id = i.id 
       WHERE ui.item_id = $1 AND ui.user_id = $2 AND ui.quantity > 0`,
      [itemId, userId]
    );

    if (itemRes.rows.length === 0) {
      return res.status(400).json({ error: 'คุณไม่มีไอเท็มนี้ในกระเป๋า หรือจำนวนหมดแล้ว' });
    }
    const item = itemRes.rows[0];

    // Target pokemon (default to active mon)
    const targetIdx = (targetIndex !== undefined && targetIndex >= 0 && targetIndex < battle.userTeam.length)
      ? targetIndex 
      : battle.userActiveIndex;
    const targetMon = battle.userTeam[targetIdx];

    // Apply item effect
    let itemUsedSuccess = false;
    let effectMessage = '';

    if (item.effect_type === 'HEAL_HP') {
      if (targetMon.hp <= 0) {
        return res.status(400).json({ error: `${targetMon.nickname} หมดสติอยู่ ต้องใช้ Revive เพื่อชุบชีวิต` });
      }
      if (targetMon.hp >= targetMon.maxHp) {
        return res.status(400).json({ error: `${targetMon.nickname} พลังชีวิตเต็มอยู่แล้ว` });
      }
      const healAmount = Math.min(targetMon.maxHp - targetMon.hp, Math.round(parseFloat(item.effect_value)));
      targetMon.hp += healAmount;
      effectMessage = `[Item] คุณใช้ ${item.name} กับ ${targetMon.nickname}! ฟื้นฟู HP +${healAmount} หน่วย (${targetMon.hp}/${targetMon.maxHp})`;
      actionSequence.push({
        type: 'ACTION_ITEM',
        actor: 'user',
        itemName: item.name,
        target: targetMon.nickname,
        healAmount,
        targetIndex: targetIdx
      });
      itemUsedSuccess = true;
    } else if (item.effect_type === 'REVIVE') {
      if (targetMon.hp > 0) {
        return res.status(400).json({ error: `${targetMon.nickname} ยังไม่หมดสติ ไม่สามารถใช้ Revive ได้` });
      }
      const healAmount = Math.round(targetMon.maxHp * (parseFloat(item.effect_value) / 100));
      targetMon.hp = healAmount;
      effectMessage = `[Revive] คุณใช้ ${item.name}! ชุบชีวิต ${targetMon.nickname} ฟื้นคืนสู่สนามด้วย HP ${healAmount} หน่วย!`;
      actionSequence.push({
        type: 'ACTION_ITEM',
        actor: 'user',
        itemName: item.name,
        target: targetMon.nickname,
        healAmount,
        targetIndex: targetIdx
      });
      itemUsedSuccess = true;
    } else if (item.effect_type === 'BOOST_ATK') {
      targetMon.stats.attack = Math.round((targetMon.stats.attack || 80) * 1.5);
      targetMon.stats.special_attack = Math.round((targetMon.stats.special_attack || 80) * 1.5);
      effectMessage = `[Boost] คุณใช้ ${item.name}! พลังโจมตีของ ${targetMon.nickname} เพิ่มขึ้น 50%!`;
      actionSequence.push({
        type: 'ACTION_ITEM',
        actor: 'user',
        itemName: item.name,
        target: targetMon.nickname,
        healAmount: 0,
        targetIndex: targetIdx
      });
      itemUsedSuccess = true;
    } else if (item.effect_type === 'BOOST_DEF') {
      targetMon.stats.defense = Math.round((targetMon.stats.defense || 70) * 1.5);
      targetMon.stats.special_defense = Math.round((targetMon.stats.special_defense || 70) * 1.5);
      effectMessage = `[Boost] คุณใช้ ${item.name}! พลังป้องกันของ ${targetMon.nickname} เพิ่มขึ้น 50%!`;
      actionSequence.push({
        type: 'ACTION_ITEM',
        actor: 'user',
        itemName: item.name,
        target: targetMon.nickname,
        healAmount: 0,
        targetIndex: targetIdx
      });
      itemUsedSuccess = true;
    } else {
      return res.status(400).json({ error: 'ไอเท็มนี้เป็นไอเท็มสวมใส่ ไม่สามารถกดใช้ในการต่อสู้ได้' });
    }

    if (itemUsedSuccess) {
      // Deduct item quantity in DB
      await db.query(
        `UPDATE user_items SET quantity = quantity - 1 WHERE user_id = $1 AND item_id = $2`,
        [userId, itemId]
      );
      turnLogs.push(effectMessage);

      // Opponent attacks the active user pokemon
      const oppMoves = oppMon.moves;
      const oppMove = oppMoves[Math.floor(Math.random() * oppMoves.length)];
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
        turnLogs.push(`[Faint] ${userMon.nickname} ของคุณหมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
      }
    }

  // ==========================================
  // ACTION: SWITCH POKEMON
  // ==========================================
  } else if (action === 'switch') {
    if (switchIndex === undefined || switchIndex === battle.userActiveIndex || !battle.userTeam[switchIndex]) {
      return res.status(400).json({ error: 'ตำแหน่งโปเกมอนที่ต้องการสลับไม่ถูกต้อง' });
    }
    const newMon = battle.userTeam[switchIndex];
    if (newMon.hp <= 0) {
      return res.status(400).json({ error: 'โปเกมอนตัวนี้หมดสติแล้ว ไม่สามารถส่งลงสนามได้' });
    }

    turnLogs.push(`[Switch] คุณเรียก ${userMon.nickname} กลับมา แล้วส่ง ${newMon.nickname} ลงสนาม!`);
    actionSequence.push({
      type: 'ACTION_SWITCH',
      actor: 'user',
      monName: newMon.nickname,
      newIndex: switchIndex
    });
    battle.userActiveIndex = switchIndex;
    const switchedMon = battle.userTeam[switchIndex];

    // Opponent attacks the switched-in Pokemon
    const oppMoves = oppMon.moves;
    const oppMove = oppMoves[Math.floor(Math.random() * oppMoves.length)];
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
      turnLogs.push(`[Faint] ${switchedMon.nickname} หมดสติลงแล้ว!`);
      actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: switchedMon.nickname });
    }

  // ==========================================
  // ACTION: ATTACK (With Mega / Z-Move / Dynamax)
  // ==========================================
  } else if (action === 'attack') {
    const selectedMove = userMon.moves[moveIndex];
    if (!selectedMove) {
      return res.status(400).json({ error: 'ไม่พบสกิลที่เลือก' });
    }

    // 1. Check Mega Evolution Trigger (STRICT VALIDATION)
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
        turnLogs.push(`[MEGA] MEGA EVOLUTION! แสงสายรุ้งประกายล้อมรอบ ${userMon.nickname} แปลงร่างเป็น 【${megaProfile.name}】!!`);
        actionSequence.push({
          type: 'ACTION_MEGA',
          actor: 'user',
          monName: megaProfile.name,
          sprite: megaProfile.sprite,
          artwork: megaProfile.artwork
        });
      } else {
        turnLogs.push(`[Notice] ${userMon.nickname || userMon.name} ไม่สามารถแปลงร่าง Mega ได้! (ต้องสวมใส่หิน Mega Stone ที่ตรงกับสายพันธุ์เท่านั้น)`);
      }
    }

    // 2. Check Z-Move Trigger (STRICT VALIDATION)
    const validZMove = zMove ? getValidZMove(userMon, userMon.held_item_name) : null;
    const useZMove = Boolean(validZMove && !battle.userZMoveUsed);
    if (zMove && !useZMove && !battle.userZMoveUsed) {
      turnLogs.push(`[Notice] ไม่สามารถใช้ Z-Move ได้! (ต้องสวมใส่ผลึก Z-Crystal และมีสกิลธาตุที่ตรงกับผลึก)`);
    } else if (useZMove) {
      battle.userZMoveUsed = true;
      actionSequence.push({
        type: 'ACTION_Z_CHARGE',
        actor: 'user',
        monName: userMon.nickname
      });
      turnLogs.push(`[Z-MOVE] Z-POWER CHARGED! ${userMon.nickname} ปลดปล่อยพลังท่าไม้ตาย Z-Move!`);
    }

    // 3. Check Dynamax Trigger
    let useDynamax = false;
    if (dynamax && !battle.userDynamaxUsed && !userMon.isDynamax) {
      const bandRes = await db.query(
        `SELECT ui.quantity FROM user_items ui JOIN items i ON ui.item_id = i.id WHERE ui.user_id = $1 AND i.code = 'dynamax_band' AND ui.quantity > 0`,
        [userId]
      );
      if (bandRes.rows.length === 0 || bandRes.rows[0].quantity <= 0) {
        turnLogs.push(`[Notice] คุณไม่มี Dynamax Band! ต้องมีสายรัด Dynamax Band ในกระเป๋าก่อนจึงจะขยายร่างยักษ์ได้`);
      } else {
        useDynamax = true;
        battle.userDynamaxUsed = true;
        const consumedBand = await db.query(
          `UPDATE user_items ui
           SET quantity = quantity - 1
           FROM items i
           WHERE ui.item_id = i.id
             AND ui.user_id = $1
             AND i.code = 'dynamax_band'
             AND ui.quantity > 0
           RETURNING ui.quantity`,
          [userId]
        );
        if (consumedBand.rows.length === 0) {
          return res.status(400).json({ error: 'Dynamax Band ถูกใช้ไปแล้วหรือไม่มีเหลือในกระเป๋า' });
        }
        userMon.isDynamax = true;
        userMon.dynamaxTurns = 3;
        userMon.maxHp = userMon.baseMaxHp * 2;
        userMon.hp = userMon.hp * 2;
        turnLogs.push(`[DYNAMAX] DYNAMAX! ${userMon.nickname} ขยายร่างยักษ์มหาศาล เมฆพายุหมุนวนรอบตัว พลังชีวิตคูณสอง!`);
        actionSequence.push({
          type: 'ACTION_DYNAMAX',
          actor: 'user',
          monName: userMon.nickname
        });
      }
    }

    // Opponent picks a move
    const oppMove = oppMon.moves[Math.floor(Math.random() * oppMon.moves.length)];

    // Speed comparison: Higher speed attacks first!
    const userSpeed = userMon.stats.speed || 50;
    const oppSpeed = oppMon.stats.speed || 50;
    const userFirst = userSpeed >= oppSpeed;

    const executeUserAttack = () => {
      const userResult = calculateAttack(userMon, oppMon, selectedMove, {
        isZMove: useZMove,
        isDynamax: userMon.isDynamax
      });
      oppMon.hp = Math.max(0, oppMon.hp - userResult.damage);
      turnLogs.push(...userResult.logs);
      actionSequence.push({
        type: 'ACTION_ATTACK',
        actor: 'user',
        attackerName: userMon.nickname,
        defenderName: oppMon.name,
        moveName: userResult.moveName,
        fxType: userResult.fxType,
        damage: userResult.damage,
        isCrit: userResult.isCrit,
        typeMult: userResult.typeMult,
        isMega: userMon.isMega,
        isZMove: useZMove,
        isDynamax: userMon.isDynamax
      });

      // Recoil damage from Life Orb
      if (userResult.recoilDamage > 0) {
        userMon.hp = Math.max(0, userMon.hp - userResult.recoilDamage);
      }
    };

    const executeOpponentAttack = () => {
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
        turnLogs.push(`[Faint] ${oppMon.name} ฝ่ายตรงข้ามหมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'opponent', monName: oppMon.name });

        const nextOppIndex = battle.opponentTeam.findIndex((p, idx) => idx > battle.opponentActiveIndex && p.hp > 0);
        if (nextOppIndex !== -1) {
          battle.opponentActiveIndex = nextOppIndex;
          const nextOpp = battle.opponentTeam[nextOppIndex];
          turnLogs.push(`[Switch] ${battle.gymName} ส่ง ${nextOpp.name} ลงสนามต่อสู้!`);
          actionSequence.push({ type: 'ACTION_SWITCH', actor: 'opponent', monName: nextOpp.name, newIndex: nextOppIndex });
        }
      } else {
        executeOpponentAttack();
        if (userMon.hp <= 0) {
          turnLogs.push(`[Faint] ${userMon.nickname} ของคุณหมดสติแล้ว!`);
          actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
        }
      }
    } else {
      executeOpponentAttack();

      if (userMon.hp <= 0) {
        turnLogs.push(`[Faint] ${userMon.nickname} ของคุณหมดสติแล้ว!`);
        actionSequence.push({ type: 'ACTION_FAINT', actor: 'user', monName: userMon.nickname });
      } else {
        executeUserAttack();
        if (oppMon.hp <= 0) {
          turnLogs.push(`[Faint] ${oppMon.name} ฝ่ายตรงข้ามหมดสติแล้ว!`);
          actionSequence.push({ type: 'ACTION_FAINT', actor: 'opponent', monName: oppMon.name });

          const nextOppIndex = battle.opponentTeam.findIndex((p, idx) => idx > battle.opponentActiveIndex && p.hp > 0);
          if (nextOppIndex !== -1) {
            battle.opponentActiveIndex = nextOppIndex;
            const nextOpp = battle.opponentTeam[nextOppIndex];
            turnLogs.push(`[Switch] ${battle.gymName} ส่ง ${nextOpp.name} ลงสนามต่อสู้!`);
            actionSequence.push({ type: 'ACTION_SWITCH', actor: 'opponent', monName: nextOpp.name, newIndex: nextOppIndex });
          }
        }
      }
    }

    // 4. End-of-turn Leftovers check
    if (userMon.held_item_name?.toLowerCase().includes('leftovers') && userMon.hp > 0 && userMon.hp < userMon.maxHp) {
      const healAmt = Math.max(1, Math.round(userMon.maxHp / 16));
      userMon.hp = Math.min(userMon.maxHp, userMon.hp + healAmt);
      turnLogs.push(`[Held Item] Leftovers ทำงาน! ${userMon.nickname} ฟื้นฟู HP +${healAmt} หน่วย`);
      actionSequence.push({ type: 'ACTION_LEFTOVERS', actor: 'user', healAmount: healAmt });
    }

    // 5. Dynamax duration counter
    if (userMon.isDynamax) {
      userMon.dynamaxTurns -= 1;
      if (userMon.dynamaxTurns <= 0) {
        userMon.isDynamax = false;
        userMon.maxHp = userMon.baseMaxHp;
        userMon.hp = Math.min(userMon.maxHp, Math.ceil(userMon.hp / 2));
        turnLogs.push(`[DYNAMAX] พลัง Dynamax ของ ${userMon.nickname} หมดลงแล้ว คืนสู่ขนาดปกติ`);
        actionSequence.push({ type: 'ACTION_DYNAMAX_END', actor: 'user', monName: userMon.nickname });
      }
    }
  }

  // Check battle end condition
  const allOpponentFainted = battle.opponentTeam.every(p => p.hp <= 0);
  const allUserFainted = battle.userTeam.every(p => p.hp <= 0);

  if (allOpponentFainted) {
    battle.status = 'VICTORY';
    turnLogs.push(`[Victory] คุณเอาชนะ ${battle.gymName} ได้สำเร็จ! ได้รับเข็มกลัด 【${battle.badge}】 และรางวัล ${battle.reward.toLocaleString()} FUKU!`);
    actionSequence.push({ type: 'ACTION_VICTORY', reward: battle.reward });

    // Award FUKU
    await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [battle.reward, userId]);
    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'VICTORY', $3, $4)`,
      [userId, battle.gymName, battle.reward, JSON.stringify(battle.logs.concat(turnLogs))]
    );
  } else if (allUserFainted) {
    battle.status = 'DEFEAT';
    turnLogs.push(`[Defeat] โปเกมอนทั้งหมดในทีมของคุณหมดสติ... คุณพ่ายแพ้การประลองในครั้งนี้`);
    actionSequence.push({ type: 'ACTION_DEFEAT' });

    await db.query(
      `INSERT INTO battle_records (user_id, gym_leader, result, reward_fuku, battle_log)
       VALUES ($1, $2, 'DEFEAT', 0, $3)`,
      [userId, battle.gymName, JSON.stringify(battle.logs.concat(turnLogs))]
    );
  } else if (userMon.hp <= 0) {
    // If active user pokemon fainted, auto switch to next available
    const nextAlive = battle.userTeam.findIndex(p => p.hp > 0);
    if (nextAlive !== -1) {
      battle.userActiveIndex = nextAlive;
      turnLogs.push(`[Switch] ส่ง ${battle.userTeam[nextAlive].nickname} ออกมาสู้แทน!`);
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

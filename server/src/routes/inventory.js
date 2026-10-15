const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all Pokemon in the user's Inventory
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        up.id, up.user_id, up.pokemon_id, up.nickname, up.level,
        up.current_hp, up.max_hp, up.stats, up.moves,
        up.is_in_team, up.team_position, up.is_for_sale, up.acquired_at,
        up.held_item_id, up.held_item_name,
        p.name, p.pokeapi_id, p.types, p.sprite_url, p.artwork_url, p.rarity, p.base_price,
        p.moves as all_available_moves
       FROM user_pokemons up
       JOIN pokemons p ON up.pokemon_id = p.id
       WHERE up.user_id = $1
       ORDER BY up.is_in_team DESC, up.team_position ASC NULLS LAST, up.id DESC`,
      [req.user.id]
    );

    res.json({ pokemons: result.rows });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดคลังโปเกมอน' });
  }
});

// Toggle in/out of battle team (Max 3 Pokemon)
router.post('/toggle-team', authMiddleware, async (req, res) => {
  const { userPokemonId } = req.body;
  const userId = req.user.id;

  if (!userPokemonId) {
    return res.status(400).json({ error: 'กรุณาระบุโปเกมอน' });
  }

  try {
    const checkRes = await db.query(
      `SELECT * FROM user_pokemons WHERE id = $1 AND user_id = $2`,
      [userPokemonId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในคลังของคุณ' });
    }

    const pokemon = checkRes.rows[0];

    if (pokemon.is_for_sale) {
      return res.status(400).json({ error: 'ไม่สามารถนำโปเกมอนที่กำลังเปิดประมูลเข้าทีมได้' });
    }

    if (pokemon.is_in_team) {
      // Remove from team
      await db.query(
        `UPDATE user_pokemons SET is_in_team = FALSE, team_position = NULL WHERE id = $1`,
        [userPokemonId]
      );
      return res.json({ message: 'นำโปเกมอนออกจากทีมต่อสู้แล้ว', isInTeam: false });
    } else {
      // Check current team size
      const teamRes = await db.query(
        `SELECT id, team_position FROM user_pokemons WHERE user_id = $1 AND is_in_team = TRUE ORDER BY team_position ASC`,
        [userId]
      );

      if (teamRes.rows.length >= 3) {
        return res.status(400).json({ error: 'ทีมต่อสู้เต็มแล้ว (จัดได้สูงสุด 3 ตัว)' });
      }

      // Find first available slot (1, 2, 3)
      const occupiedPositions = teamRes.rows.map(p => p.team_position);
      let nextPos = 1;
      for (let i = 1; i <= 3; i++) {
        if (!occupiedPositions.includes(i)) {
          nextPos = i;
          break;
        }
      }

      await db.query(
        `UPDATE user_pokemons SET is_in_team = TRUE, team_position = $1 WHERE id = $2`,
        [nextPos, userPokemonId]
      );

      return res.json({ 
        message: `จัดโปเกมอนเข้าสู่ทีมตำแหน่งที่ ${nextPos} สำเร็จ!`, 
        isInTeam: true,
        teamPosition: nextPos 
      });
    }
  } catch (err) {
    console.error('Toggle team error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการจัดทีม' });
  }
});

// Quick sell Pokemon for instant FUKU
router.post('/quick-sell', authMiddleware, async (req, res) => {
  const { userPokemonId } = req.body;
  const userId = req.user.id;

  try {
    const checkRes = await db.query(
      `SELECT up.*, p.base_price, p.name 
       FROM user_pokemons up
       JOIN pokemons p ON up.pokemon_id = p.id
       WHERE up.id = $1 AND up.user_id = $2`,
      [userPokemonId, userId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้' });
    }

    const pokemon = checkRes.rows[0];

    if (pokemon.is_for_sale) {
      return res.status(400).json({ error: 'โปเกมอนกำลังเปิดประมูลอยู่ ไม่สามารถขายด่วนได้' });
    }
    if (pokemon.is_in_team) {
      return res.status(400).json({ error: 'โปเกมอนอยู่ในทีมต่อสู้ กรุณาปลดออกจากทีมก่อน' });
    }

    // Sell value is 70% of base price
    const sellPrice = Math.round(parseFloat(pokemon.base_price) * 0.7);

    await db.query('DELETE FROM user_pokemons WHERE id = $1', [userPokemonId]);
    const updatedUser = await db.query(
      'UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2 RETURNING fuku_balance',
      [sellPrice, userId]
    );

    res.json({
      message: `ขายด่วน ${pokemon.nickname || pokemon.name} สำเร็จ! ได้รับ ${sellPrice.toLocaleString()} FUKU`,
      sellPrice,
      newBalance: updatedUser.rows[0].fuku_balance
    });
  } catch (err) {
    console.error('Quick sell error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการขายด่วน' });
  }
});

// Rename nickname
router.put('/:id/nickname', authMiddleware, async (req, res) => {
  const { nickname } = req.body;
  try {
    await db.query(
      'UPDATE user_pokemons SET nickname = $1 WHERE id = $2 AND user_id = $3',
      [nickname ? nickname.trim().slice(0, 30) : null, req.params.id, req.user.id]
    );
    res.json({ message: 'เปลี่ยนชื่อเล่นสำเร็จ!' });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถเปลี่ยนชื่อได้' });
  }
});

module.exports = router;

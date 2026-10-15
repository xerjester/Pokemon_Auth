const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 1. Get all shop items
router.get('/shop', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM items WHERE is_shop_item = TRUE';
    const params = [];

    if (category && category !== 'ALL') {
      query += ' AND category = $1';
      params.push(category);
    }

    query += ' ORDER BY price_fuku ASC';
    const result = await db.query(query, params);

    res.json({ items: result.rows });
  } catch (err) {
    console.error('Error fetching shop items:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการสินค้า' });
  }
});

// 2. Buy item from shop using FUKU
router.post('/buy', authMiddleware, async (req, res) => {
  const { itemId, quantity = 1 } = req.body;
  const userId = req.user.id;

  if (!itemId || quantity <= 0) {
    return res.status(400).json({ error: 'ข้อมูลการสั่งซื้อไม่ถูกต้อง' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get item info
    const itemRes = await client.query('SELECT * FROM items WHERE id = $1', [itemId]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบไอเท็มที่ต้องการซื้อ' });
    }
    const item = itemRes.rows[0];
    const totalCost = parseFloat(item.price_fuku) * quantity;

    // Check user balance
    const userRes = await client.query('SELECT fuku_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const userBalance = parseFloat(userRes.rows[0].fuku_balance);

    if (userBalance < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `ยอดเงิน FUKU ไม่เพียงพอ (ต้องการ ${totalCost.toLocaleString()} FUKU แต่มี ${userBalance.toLocaleString()} FUKU)`
      });
    }

    // Deduct user balance
    const newBalance = userBalance - totalCost;
    await client.query('UPDATE users SET fuku_balance = $1 WHERE id = $2', [newBalance, userId]);

    // Upsert into user_items
    await client.query(`
      INSERT INTO user_items (user_id, item_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, item_id) DO UPDATE 
      SET quantity = user_items.quantity + EXCLUDED.quantity;
    `, [userId, itemId, quantity]);

    await client.query('COMMIT');

    res.json({
      message: `ซื้อ ${item.name} จำนวน ${quantity} ชิ้นสำเร็จ!`,
      newBalance,
      item
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error buying item:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการซื้อไอเท็ม' });
  } finally {
    client.release();
  }
});

// 3. Get user's own items
router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(`
      SELECT ui.id as user_item_id, ui.quantity, i.*
      FROM user_items ui
      JOIN items i ON ui.item_id = i.id
      WHERE ui.user_id = $1 AND ui.quantity > 0
      ORDER BY i.category ASC, i.price_fuku DESC
    `, [userId]);

    res.json({ items: result.rows });
  } catch (err) {
    console.error('Error fetching user items:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงไอเท็มของคุณ' });
  }
});

// 4. Equip item to a Pokemon
router.post('/equip', authMiddleware, async (req, res) => {
  const { userPokemonId, itemId } = req.body;
  const userId = req.user.id;

  try {
    // Verify pokemon ownership
    const pokeRes = await db.query(
      `SELECT up.*, p.name as pokemon_name 
       FROM user_pokemons up 
       JOIN pokemons p ON up.pokemon_id = p.id 
       WHERE up.id = $1 AND up.user_id = $2`,
      [userPokemonId, userId]
    );
    if (pokeRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในคลังของคุณ' });
    }
    const pokemon = pokeRes.rows[0];

    // Verify item ownership
    const itemRes = await db.query(
      `SELECT ui.*, i.name, i.code, i.category, i.target_pokemon 
       FROM user_items ui 
       JOIN items i ON ui.item_id = i.id 
       WHERE ui.item_id = $1 AND ui.user_id = $2 AND ui.quantity > 0`,
      [itemId, userId]
    );
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'คุณไม่มีไอเท็มนี้ในกระเป๋า' });
    }
    const item = itemRes.rows[0];

    // Check if target pokemon matches for specific Mega Stones
    if (item.target_pokemon) {
      const monNameLower = pokemon.pokemon_name.toLowerCase();
      if (!monNameLower.includes(item.target_pokemon.toLowerCase())) {
        return res.status(400).json({
          error: `ไอเท็ม ${item.name} สามารถสวมใส่ได้เฉพาะกับ ${item.target_pokemon} เท่านั้น`
        });
      }
    }

    // Equip item
    await db.query(
      `UPDATE user_pokemons 
       SET held_item_id = $1, held_item_name = $2 
       WHERE id = $3`,
      [item.item_id, item.name, userPokemonId]
    );

    res.json({
      message: `สวมใส่ ${item.name} ให้กับ ${pokemon.nickname || pokemon.pokemon_name} สำเร็จ!`,
      held_item_id: item.item_id,
      held_item_name: item.name
    });
  } catch (err) {
    console.error('Error equipping item:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสวมใส่ไอเท็ม' });
  }
});

// 5. Unequip item from Pokemon
router.post('/unequip', authMiddleware, async (req, res) => {
  const { userPokemonId } = req.body;
  const userId = req.user.id;

  try {
    const pokeRes = await db.query(
      `SELECT * FROM user_pokemons WHERE id = $1 AND user_id = $2`,
      [userPokemonId, userId]
    );
    if (pokeRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในคลังของคุณ' });
    }

    await db.query(
      `UPDATE user_pokemons SET held_item_id = NULL, held_item_name = NULL WHERE id = $1`,
      [userPokemonId]
    );

    res.json({ message: 'ถอดไอเท็มออกจากโปเกมอนเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error unequipping item:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการถอดไอเท็ม' });
  }
});

module.exports = router;

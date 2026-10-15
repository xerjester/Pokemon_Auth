const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { ensureActiveFlashAuction } = require('../services/flashAuction');

const router = express.Router();

// Helper to settle expired auctions automatically
async function autoSettleExpiredAuctions() {
  try {
    await ensureActiveFlashAuction();

    const expired = await db.query(
      `SELECT * FROM auctions WHERE status = 'ACTIVE' AND end_time <= CURRENT_TIMESTAMP AND auction_type NOT IN ('FLASH_SYSTEM', 'FLASH_POKEMON', 'FLASH_ITEM')`
    );

    for (const auc of expired.rows) {
      if (auc.highest_bidder_id) {
        // Transfer Pokemon ownership to highest bidder
        await db.query(
          `UPDATE user_pokemons SET user_id = $1, is_for_sale = FALSE, is_in_team = FALSE, team_position = NULL WHERE id = $2`,
          [auc.highest_bidder_id, auc.user_pokemon_id]
        );
        // Credit seller with the winning bid amount
        await db.query(
          `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2`,
          [auc.current_bid, auc.seller_id]
        );
        // Mark auction completed
        await db.query(`UPDATE auctions SET status = 'COMPLETED' WHERE id = $1`, [auc.id]);
      } else {
        // No bids placed; return pokemon to seller
        await db.query(
          `UPDATE user_pokemons SET is_for_sale = FALSE WHERE id = $1`,
          [auc.user_pokemon_id]
        );
        await db.query(`UPDATE auctions SET status = 'CANCELLED' WHERE id = $1`, [auc.id]);
      }
    }
  } catch (err) {
    console.error('Error in autoSettleExpiredAuctions:', err.message);
  }
}

// Get all active auctions
router.get('/', async (req, res) => {
  try {
    await autoSettleExpiredAuctions();

    const { type, rarity, search, mode } = req.query;

    let query = `
      SELECT 
        a.id, a.user_pokemon_id, a.item_id, a.seller_id, a.start_bid, a.current_bid,
        a.highest_bidder_id, a.buyout_price, a.end_time, a.status, a.created_at, a.auction_type,
        u_seller.username as seller_name,
        u_bidder.username as highest_bidder_name,
        up.level, up.nickname, up.moves,
        COALESCE(p.id, 0) as pokemon_id, 
        COALESCE(p.name, i.name) as name, 
        COALESCE(p.types, '[]'::jsonb) as types, 
        p.base_stats, 
        COALESCE(p.sprite_url, i.icon_url) as sprite_url, 
        COALESCE(p.artwork_url, i.icon_url) as artwork_url, 
        COALESCE(p.rarity, i.rarity) as rarity,
        i.name as item_name,
        i.category as item_category,
        i.description as item_description,
        i.icon_url as item_icon_url,
        EXTRACT(EPOCH FROM (a.end_time - CURRENT_TIMESTAMP)) as seconds_remaining
      FROM auctions a
      LEFT JOIN user_pokemons up ON a.user_pokemon_id = up.id
      LEFT JOIN pokemons p ON up.pokemon_id = p.id
      LEFT JOIN items i ON a.item_id = i.id
      JOIN users u_seller ON a.seller_id = u_seller.id
      LEFT JOIN users u_bidder ON a.highest_bidder_id = u_bidder.id
      WHERE a.status = 'ACTIVE' AND a.end_time > CURRENT_TIMESTAMP
    `;

    const params = [];
    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(i.name) LIKE $${params.length})`;
    }
    if (rarity) {
      params.push(rarity);
      query += ` AND (p.rarity = $${params.length} OR i.rarity = $${params.length})`;
    }

    query += ` ORDER BY a.end_time ASC`;

    const result = await db.query(query, params);

    // Filter by type if provided (in JSONB)
    let filtered = result.rows;
    if (type) {
      filtered = filtered.filter(item => {
        const types = Array.isArray(item.types) ? item.types : JSON.parse(item.types || '[]');
        return types.some(t => t.toLowerCase() === type.toLowerCase());
      });
    }

    const flashPokemonAuction = filtered.find(a => a.auction_type === 'FLASH_POKEMON' || (a.auction_type === 'FLASH_SYSTEM' && a.user_pokemon_id)) || null;
    const flashItemAuction = filtered.find(a => a.auction_type === 'FLASH_ITEM' || (a.auction_type === 'FLASH_SYSTEM' && a.item_id)) || null;
    const flashAuction = flashPokemonAuction || flashItemAuction;
    const playerAuctions = filtered.filter(a => !['FLASH_SYSTEM', 'FLASH_POKEMON', 'FLASH_ITEM'].includes(a.auction_type));

    res.json({ 
      flashPokemonAuction,
      flashItemAuction,
      flashAuction,
      playerAuctions,
      auctions: filtered 
    });
  } catch (err) {
    console.error('Error fetching auctions:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดรายการประมูล' });
  }
});

// Get single auction detail with bid history
router.get('/:id', async (req, res) => {
  try {
    await autoSettleExpiredAuctions();

    const auctionRes = await db.query(
      `SELECT 
        a.*,
        u_seller.username as seller_name,
        u_bidder.username as highest_bidder_name,
        up.level, up.nickname, up.moves, up.stats,
        COALESCE(p.name, i.name) as name, 
        COALESCE(p.types, '[]'::jsonb) as types, 
        p.base_stats, 
        COALESCE(p.sprite_url, i.icon_url) as sprite_url, 
        COALESCE(p.artwork_url, i.icon_url) as artwork_url, 
        COALESCE(p.rarity, i.rarity) as rarity,
        i.name as item_name,
        i.category as item_category,
        i.description as item_description,
        i.icon_url as item_icon_url,
        EXTRACT(EPOCH FROM (a.end_time - CURRENT_TIMESTAMP)) as seconds_remaining
      FROM auctions a
      LEFT JOIN user_pokemons up ON a.user_pokemon_id = up.id
      LEFT JOIN pokemons p ON up.pokemon_id = p.id
      LEFT JOIN items i ON a.item_id = i.id
      JOIN users u_seller ON a.seller_id = u_seller.id
      LEFT JOIN users u_bidder ON a.highest_bidder_id = u_bidder.id
      WHERE a.id = $1`,
      [req.params.id]
    );

    if (auctionRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการประมูลนี้' });
    }

    const bidsRes = await db.query(
      `SELECT b.*, u.username as bidder_name 
       FROM bids b 
       JOIN users u ON b.bidder_id = u.id 
       WHERE b.auction_id = $1 
       ORDER BY b.amount DESC 
       LIMIT 20`,
      [req.params.id]
    );

    res.json({
      auction: auctionRes.rows[0],
      bids: bidsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการประมูล' });
  }
});

// Place a bid
router.post('/:id/bid', authMiddleware, async (req, res) => {
  const auctionId = req.params.id;
  const bidAmount = parseFloat(req.body.amount);
  const txHash = req.body.txHash || null;
  const userId = req.user.id;

  if (isNaN(bidAmount) || bidAmount <= 0) {
    return res.status(400).json({ error: 'กรุณาระบุจำนวน FUKU ที่ถูกต้อง' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch auction with lock
    const aucRes = await client.query(
      `SELECT * FROM auctions WHERE id = $1 FOR UPDATE`,
      [auctionId]
    );

    if (aucRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบรายการประมูลนี้' });
    }

    const auction = aucRes.rows[0];

    if (auction.status !== 'ACTIVE' || new Date(auction.end_time) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'การประมูลนี้สิ้นสุดลงแล้ว' });
    }

    if (auction.seller_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'คุณไม่สามารถประมูลโปเกมอนของตัวเองได้' });
    }

    // Minimum required bid
    const minBid = auction.highest_bidder_id 
      ? parseFloat(auction.current_bid) + Math.max(50, Math.round(parseFloat(auction.current_bid) * 0.05))
      : parseFloat(auction.start_bid);

    if (bidAmount < minBid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `ราคาประมูลขั้นต่ำคือ ${minBid.toLocaleString()} FUKU` 
      });
    }

    // Check user's balance
    const userRes = await client.query(`SELECT fuku_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
    const userBalance = parseFloat(userRes.rows[0].fuku_balance);

    if (userBalance < bidAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `เหรียญ FUKU ของคุณไม่เพียงพอ (มี ${userBalance.toLocaleString()} FUKU)` 
      });
    }

    // Refund previous bidder if any
    if (auction.highest_bidder_id && auction.highest_bidder_id !== userId) {
      await client.query(
        `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2`,
        [auction.current_bid, auction.highest_bidder_id]
      );
    }

    // Deduct new bidder's balance
    await client.query(
      `UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2`,
      [bidAmount, userId]
    );

    // Record bid
    await client.query(
      `INSERT INTO bids (auction_id, bidder_id, amount, tx_hash) VALUES ($1, $2, $3, $4)`,
      [auctionId, userId, bidAmount, txHash]
    );

    // Anti-snipe: if less than 60 seconds left, extend by 60 seconds
    const remainingMs = new Date(auction.end_time).getTime() - Date.now();
    let newEndTime = auction.end_time;
    if (remainingMs < 60000) {
      newEndTime = new Date(Date.now() + 60000);
    }

    // Check Buyout
    let isBuyout = false;
    if (auction.buyout_price && bidAmount >= parseFloat(auction.buyout_price)) {
      isBuyout = true;
      // Instant buyout: transfer pokemon to winner
      await client.query(
        `UPDATE user_pokemons SET user_id = $1, is_for_sale = FALSE, is_in_team = FALSE, team_position = NULL WHERE id = $2`,
        [userId, auction.user_pokemon_id]
      );
      // Transfer FUKU to seller
      await client.query(
        `UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2`,
        [bidAmount, auction.seller_id]
      );
      // Complete auction
      await client.query(
        `UPDATE auctions SET current_bid = $1, highest_bidder_id = $2, status = 'COMPLETED' WHERE id = $3`,
        [bidAmount, userId, auctionId]
      );
    } else {
      // Normal bid update
      await client.query(
        `UPDATE auctions SET current_bid = $1, highest_bidder_id = $2, end_time = $3 WHERE id = $4`,
        [bidAmount, userId, newEndTime, auctionId]
      );
    }

    await client.query('COMMIT');

    const updatedUserRes = await db.query('SELECT fuku_balance FROM users WHERE id = $1', [userId]);

    res.json({
      message: isBuyout 
        ? '🎉 ซื้อทันที (Buyout) สำเร็จ! โปเกมอนถูกย้ายเข้าสู่คลังของคุณแล้ว' 
        : 'เสนอราคาประมูลสำเร็จ!',
      currentBid: bidAmount,
      isBuyout,
      newBalance: updatedUserRes.rows[0].fuku_balance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bid error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเสนอราคา' });
  } finally {
    client.release();
  }
});

// Create auction from inventory
router.post('/create', authMiddleware, async (req, res) => {
  const { userPokemonId, startBid, buyoutPrice, durationMinutes } = req.body;
  const userId = req.user.id;

  if (!userPokemonId || !startBid || parseFloat(startBid) <= 0) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลการประมูลให้ถูกต้อง' });
  }

  const duration = Math.min(Math.max(parseInt(durationMinutes) || 10, 1), 1440); // 1 min to 24 hrs
  const endTime = new Date(Date.now() + duration * 60 * 1000);

  try {
    const pokeRes = await db.query(
      `SELECT * FROM user_pokemons WHERE id = $1 AND user_id = $2`,
      [userPokemonId, userId]
    );

    if (pokeRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในคลังของคุณ' });
    }

    const pokemon = pokeRes.rows[0];

    if (pokemon.is_in_team) {
      return res.status(400).json({ error: 'ไม่สามารถนำโปเกมอนที่อยู่ในทีมต่อสู้ออกมาประมูลได้ กรุณาปลดออกจากทีมก่อน' });
    }

    if (pokemon.is_for_sale) {
      return res.status(400).json({ error: 'โปเกมอนตัวนี้กำลังอยู่ในการประมูลแล้ว' });
    }

    // Mark pokemon as for sale
    await db.query(`UPDATE user_pokemons SET is_for_sale = TRUE WHERE id = $1`, [userPokemonId]);

    // Create auction
    const newAuc = await db.query(
      `INSERT INTO auctions (user_pokemon_id, seller_id, start_bid, current_bid, buyout_price, end_time, status)
       VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE')
       RETURNING *`,
      [userPokemonId, userId, startBid, buyoutPrice ? parseFloat(buyoutPrice) : null, endTime]
    );

    res.status(201).json({
      message: 'สร้างรายการประมูลสำเร็จเรียบร้อย!',
      auction: newAuc.rows[0]
    });
  } catch (err) {
    console.error('Create auction error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างรายการประมูล' });
  }
});

module.exports = router;

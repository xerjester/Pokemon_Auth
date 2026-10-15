const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { getOnChainBalance } = require('../services/web3');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  const { username, email, password, walletAddress } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีผู้ใช้งานแล้ว' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, wallet_address, fuku_balance)
       VALUES ($1, $2, $3, $4, 10000.00)
       RETURNING id, username, email, wallet_address, fuku_balance, created_at`,
      [username.trim(), email.trim(), passwordHash, walletAddress || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Give new user 1 starter Pokemon (Pikachu, Charmander, Squirtle, or Bulbasaur)
    const starterChoices = [25, 4, 7, 1]; // Pikachu, Charmander, Squirtle, Bulbasaur
    const randomStarterId = starterChoices[Math.floor(Math.random() * starterChoices.length)];
    
    const starterData = await db.query('SELECT * FROM pokemons WHERE pokeapi_id = $1', [randomStarterId]);
    if (starterData.rows.length > 0) {
      const p = starterData.rows[0];
      const maxHp = (p.base_stats.hp || 50) * 3;
      const initialMoves = (p.moves || []).slice(0, 4);
      await db.query(
        `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_in_team, team_position)
         VALUES ($1, $2, $3, 25, $4, $5, $6, $7, TRUE, 1)`,
        [user.id, p.id, p.name, maxHp, maxHp, JSON.stringify(p.base_stats), JSON.stringify(initialMoves)]
      );
    }

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ! ได้รับ 10,000 FUKU และโปเกมอนเริ่มต้นเข้าสู่คลังเรียบร้อย',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;
    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// Get current user profile + live on-chain FUKU balance
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let onChainFuku = '0.00';
    if (req.user.wallet_address) {
      onChainFuku = await getOnChainBalance(req.user.wallet_address);
    }

    res.json({
      user: {
        ...req.user,
        onChainFuku
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
  }
});

// Link MetaMask wallet address
router.post('/link-wallet', authMiddleware, async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'กรุณาระบุ Wallet Address' });
  }

  try {
    await db.query('UPDATE users SET wallet_address = $1 WHERE id = $2', [walletAddress, req.user.id]);
    const onChainFuku = await getOnChainBalance(walletAddress);

    res.json({
      message: 'เชื่อมต่อกระเป๋าสำเร็จ!',
      wallet_address: walletAddress,
      onChainFuku
    });
  } catch (err) {
    console.error('Link wallet error:', err);
    res.status(500).json({ error: 'ไม่สามารถเชื่อมต่อกระเป๋าได้' });
  }
});

// Demo Faucet for testing
router.post('/claim-faucet', authMiddleware, async (req, res) => {
  try {
    const FAUCET_AMOUNT = 5000;
    const result = await db.query(
      `UPDATE users
       SET fuku_balance = fuku_balance + $1, faucet_claimed_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND faucet_claimed_at IS NULL
       RETURNING fuku_balance`,
      [FAUCET_AMOUNT, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'บัญชีนี้รับเหรียญทดสอบ 5,000 FUKU ไปแล้ว รับได้เพียงครั้งเดียวต่อบัญชี' });
    }

    res.json({
      message: `รับเหรียญทดสอบ ${FAUCET_AMOUNT.toLocaleString()} FUKU สำเร็จ!`,
      newBalance: result.rows[0].fuku_balance
    });
  } catch (err) {
    res.status(500).json({ error: 'เคลมเหรียญไม่สำเร็จ' });
  }
});

module.exports = router;

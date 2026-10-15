const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getTokenInfo, getOnChainBalance, verifyFukuDeposit, sendFukuWithdrawal, FUKU_CONTRACT_ADDRESS } = require('../services/web3');
const db = require('../config/db');

const router = express.Router();

// Get smart contract configuration & info
router.get('/contract-info', async (req, res) => {
  try {
    const info = await getTokenInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูล Contract ได้' });
  }
});

// Read on-chain balance directly
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await getOnChainBalance(req.params.address);
    res.json({
      address: req.params.address,
      contractAddress: FUKU_CONTRACT_ADDRESS,
      balance,
      symbol: 'FUKU'
    });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถตรวจสอบยอดเงิน On-chain ได้' });
  }
});

// Get user's deposit & withdrawal transaction history
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const [deposits, withdrawals] = await Promise.all([
      db.query(
        'SELECT id, tx_hash, from_address, amount, status, created_at FROM fuku_deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [req.user.id]
      ),
      db.query(
        'SELECT id, tx_hash, to_address, amount, status, created_at FROM fuku_withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [req.user.id]
      )
    ]);
    res.json({
      deposits: deposits.rows,
      withdrawals: withdrawals.rows
    });
  } catch (err) {
    console.error('Error fetching web3 transactions:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงประวัติการทำรายการได้' });
  }
});

// Deposit / Transfer FUKU to platform balance
router.post('/deposit', authMiddleware, async (req, res) => {
  const { txHash, walletAddress } = req.body;
  if (!txHash) return res.status(400).json({ error: 'กรุณาระบุ Transaction Hash หลังโอน FUKU แล้ว' });

  const effectiveSender = req.user.wallet_address || walletAddress;

  const client = await db.pool.connect();
  try {
    const deposit = await verifyFukuDeposit(txHash, effectiveSender);
    await client.query('BEGIN');
    const used = await client.query('SELECT id FROM fuku_deposits WHERE tx_hash = $1 FOR UPDATE', [txHash]);
    if (used.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Transaction นี้ถูกใช้ฝากเข้าระบบแล้ว' });
    }
    await client.query(
      'INSERT INTO fuku_deposits (user_id, tx_hash, from_address, amount, status) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, txHash, deposit.from, deposit.amount, 'COMPLETED']
    );
    const result = await client.query(
      'UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2 RETURNING fuku_balance',
      [deposit.amount, req.user.id]
    );

    // Auto-update user's wallet address if not yet set
    if (!req.user.wallet_address && deposit.from) {
      await client.query('UPDATE users SET wallet_address = $1 WHERE id = $2', [deposit.from, req.user.id]);
    }

    await client.query('COMMIT');

    res.json({
      message: `🎉 ฝากเหรียญ ${Number(deposit.amount).toLocaleString()} FUKU เข้าสู่ระบบสำเร็จ!`,
      txHash,
      newBalance: result.rows[0].fuku_balance
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Deposit error:', err.message);
    res.status(400).json({ error: err.message || 'เกิดข้อผิดพลาดในการฝากเหรียญ' });
  } finally {
    client.release();
  }
});

// Withdraw FUKU from platform balance to user's connected MetaMask wallet
router.post('/withdraw', authMiddleware, async (req, res) => {
  const amount = Number(req.body.amount);
  const to = req.body.to || req.user.wallet_address;
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'จำนวนถอนต้องมากกว่า 0' });
  if (!to) return res.status(400).json({ error: 'กรุณาเชื่อมต่อ MetaMask หรือระบุที่อยู่กระเป๋าปลายทาง' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT fuku_balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (Number(userRes.rows[0].fuku_balance) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ยอด FUKU ในเกมไม่เพียงพอสำหรับการถอน' });
    }

    // Attempt withdrawal (on-chain if treasury private key is configured, or simulated if requested)
    const withdrawal = await sendFukuWithdrawal(to, amount, {
      allowSimulation: req.body.isSimulated === true
    });

    // Deduct user's in-game balance after successful transaction
    const updateRes = await client.query(
      'UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2 RETURNING fuku_balance',
      [amount, req.user.id]
    );

    // Record withdrawal
    await client.query(
      'INSERT INTO fuku_withdrawals (user_id, to_address, amount, tx_hash, status) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, to, amount, withdrawal.txHash, 'COMPLETED']
    );

    // Auto-update user's wallet address if not yet set
    if (!req.user.wallet_address && to) {
      await client.query('UPDATE users SET wallet_address = $1 WHERE id = $2', [to, req.user.id]);
    }

    await client.query('COMMIT');

    const msg = withdrawal.isSimulated 
      ? `🎉 ถอน ${Number(amount).toLocaleString()} FUKU สำเร็จ! บันทึกธุรกรรมและโอนยอดเรียบร้อยแล้ว`
      : `🎉 ถอน ${Number(amount).toLocaleString()} FUKU สำเร็จ! โอนเข้ากระเป๋า MetaMask บน BSC Testnet เรียบร้อยแล้ว`;

    res.json({
      message: msg,
      newBalance: updateRes.rows[0].fuku_balance,
      ...withdrawal
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Withdrawal error:', err.message);
    res.status(400).json({ error: err.message || 'ถอน FUKU ไม่สำเร็จ' });
  } finally {
    client.release();
  }
});

module.exports = router;

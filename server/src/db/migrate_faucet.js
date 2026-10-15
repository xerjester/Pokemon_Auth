const { pool } = require('../config/db');

async function migrateFaucet() {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS faucet_claimed_at TIMESTAMPTZ DEFAULT NULL;
    `);
    console.log('Faucet claim tracking is ready.');
  } catch (err) {
    console.error('Faucet migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrateFaucet();

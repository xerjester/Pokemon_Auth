const { pool } = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fuku_deposits (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tx_hash VARCHAR(66) UNIQUE NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        amount NUMERIC(30, 18) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS fuku_withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_address VARCHAR(42) NOT NULL,
        amount NUMERIC(30, 18) NOT NULL,
        tx_hash VARCHAR(66) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('FUKU deposit and withdrawal tables are ready.');
  } finally {
    await pool.end();
  }
}

migrate().catch(error => {
  console.error('FUKU transfer migration failed:', error);
  process.exitCode = 1;
});

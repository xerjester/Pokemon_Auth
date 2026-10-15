const db = require('../config/db');

async function migrateWeb3Transactions() {
  console.log('🔄 Starting Web3 transaction tables migration...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Deposits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fuku_deposits (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        tx_hash VARCHAR(66) UNIQUE NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table fuku_deposits (or already exists)');

    // 2. Withdrawals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fuku_withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        to_address VARCHAR(42) NOT NULL,
        amount DECIMAL(18, 2) NOT NULL,
        tx_hash VARCHAR(66),
        status VARCHAR(20) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table fuku_withdrawals (or already exists)');

    await client.query('COMMIT');
    console.log('🎉 Web3 transactions migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateWeb3Transactions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateWeb3Transactions;

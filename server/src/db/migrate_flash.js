const db = require('../config/db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE auctions ADD COLUMN IF NOT EXISTS auction_type VARCHAR(20) DEFAULT 'PLAYER'`);
    console.log('✅ Added auction_type column to auctions table.');

    // Create system auction house account if it doesn't exist
    const systemUser = await db.query("SELECT id FROM users WHERE username = 'system_auction_house'");
    if (systemUser.rows.length === 0) {
      await db.query(`
        INSERT INTO users (username, email, password_hash, fuku_balance)
        VALUES ('system_auction_house', 'system@pokemart.official', 'system_protected_hash', 10000000.00)
      `);
      console.log('✅ Created system_auction_house account.');
    }

    // Shorten existing active auctions for quick testing (between 2 to 5 minutes)
    await db.query(`
      UPDATE auctions 
      SET end_time = CURRENT_TIMESTAMP + (INTERVAL '1 minute' * (ROUND(RANDOM() * 3) + 2))
      WHERE status = 'ACTIVE'
    `);
    console.log('✅ Shortened all active auction durations to 2-5 minutes for testing.');

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();

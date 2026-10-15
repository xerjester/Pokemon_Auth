const { pool } = require('../config/db');

async function migrateFarming() {
  console.log('🌱 Starting Farming System Migration...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_farming (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        last_faucet_at TIMESTAMPTZ DEFAULT NULL,
        wild_battles_won INT DEFAULT 0,
        last_wild_battle_at TIMESTAMPTZ DEFAULT NULL,
        quests_claimed JSONB DEFAULT '[]'::jsonb,
        last_quest_reset_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ user_farming table created/ready');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateFarming();

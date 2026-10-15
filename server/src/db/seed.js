const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { fetchPokemonFromAPI } = require('../services/pokeapi');

const INITIAL_POKEMON_IDS = [
  6,   // Charizard
  9,   // Blastoise
  3,   // Venusaur
  25,  // Pikachu
  94,  // Gengar
  130, // Gyarados
  143, // Snorlax
  149, // Dragonite
  150, // Mewtwo
  248, // Tyranitar
  384, // Rayquaza
  448  // Lucario
];

async function runSeed() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Run schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('📦 Executing schema.sql...');
  await db.query(schemaSql);
  console.log('✅ Schema tables verified.');

  // 2. Insert or verify Pokemons from PokéAPI
  console.log('🔍 Fetching & inserting Pokémon from PokéAPI...');
  for (const pokeId of INITIAL_POKEMON_IDS) {
    try {
      const existing = await db.query('SELECT id FROM pokemons WHERE pokeapi_id = $1', [pokeId]);
      if (existing.rows.length === 0) {
        console.log(`  -> Fetching Pokémon #${pokeId}...`);
        const p = await fetchPokemonFromAPI(pokeId);
        await db.query(
          `INSERT INTO pokemons (pokeapi_id, name, types, base_stats, sprite_url, artwork_url, rarity, base_price, moves)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            p.pokeapi_id,
            p.name,
            JSON.stringify(p.types),
            JSON.stringify(p.base_stats),
            p.sprite_url,
            p.artwork_url,
            p.rarity,
            p.base_price,
            JSON.stringify(p.moves)
          ]
        );
        console.log(`  ✅ Loaded ${p.name} (${p.rarity})`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Failed to fetch Pokemon #${pokeId}:`, err.message);
    }
  }

  // 3. Create Default Users
  console.log('👥 Creating default demo users...');
  const salt = await bcrypt.genSalt(10);
  const defaultUsers = [
    { username: 'ash_ketchum', email: 'ash@pallet.town', password: 'pika1234', balance: 50000.00, wallet: '0x1111111111111111111111111111111111111111' },
    { username: 'gary_oak', email: 'gary@pallet.town', password: 'blastoise123', balance: 100000.00, wallet: '0x2222222222222222222222222222222222222222' },
    { username: 'red_champion', email: 'red@indigo.plateau', password: 'charizard123', balance: 250000.00, wallet: '0x3333333333333333333333333333333333333333' }
  ];

  const userIds = {};
  for (const u of defaultUsers) {
    let userRow = await db.query('SELECT id FROM users WHERE username = $1', [u.username]);
    if (userRow.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, salt);
      const inserted = await db.query(
        `INSERT INTO users (username, email, password_hash, wallet_address, fuku_balance)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.username, u.email, hash, u.wallet, u.balance]
      );
      userIds[u.username] = inserted.rows[0].id;
    } else {
      userIds[u.username] = userRow.rows[0].id;
    }
  }
  console.log('✅ Default users ready.');

  // 4. Give Ash some starter team Pokemon if empty
  const ashPokes = await db.query('SELECT id FROM user_pokemons WHERE user_id = $1', [userIds.ash_ketchum]);
  if (ashPokes.rows.length === 0) {
    console.log('⚡ Giving Ash Ketchum starter team (Pikachu, Charizard, Snorlax)...');
    const pika = await db.query('SELECT * FROM pokemons WHERE name ILIKE $1', ['Pikachu']);
    const chari = await db.query('SELECT * FROM pokemons WHERE name ILIKE $1', ['Charizard']);
    const snor = await db.query('SELECT * FROM pokemons WHERE name ILIKE $1', ['Snorlax']);

    const toAdd = [
      { row: pika.rows[0], slot: 1, level: 65 },
      { row: chari.rows[0], slot: 2, level: 68 },
      { row: snor.rows[0], slot: 3, level: 60 }
    ];

    for (const item of toAdd) {
      if (item.row) {
        const p = item.row;
        const maxHp = (p.base_stats.hp || 50) * 3;
        const moves = (p.moves || []).slice(0, 4);
        await db.query(
          `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_in_team, team_position)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)`,
          [userIds.ash_ketchum, p.id, p.name, item.level, maxHp, maxHp, JSON.stringify(p.base_stats), JSON.stringify(moves), item.slot]
        );
      }
    }
  }

  // 5. Create Initial Auctions by Gary and Red
  const activeAuctions = await db.query(`SELECT id FROM auctions WHERE status = 'ACTIVE'`);
  if (activeAuctions.rows.length === 0) {
    console.log('🏷️ Creating initial live auctions...');
    const pokeList = await db.query('SELECT * FROM pokemons ORDER BY id ASC');

    // Give Gary and Red some Pokemons to auction off
    for (const p of pokeList.rows) {
      if (['Mewtwo', 'Rayquaza', 'Gengar', 'Dragonite', 'Lucario', 'Blastoise'].includes(p.name)) {
        const sellerId = p.rarity === 'Legendary' ? userIds.red_champion : userIds.gary_oak;
        const maxHp = (p.base_stats.hp || 50) * 3;
        const moves = (p.moves || []).slice(0, 4);

        const upRes = await db.query(
          `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_for_sale)
           VALUES ($1, $2, $3, 50, $4, $5, $6, $7, TRUE)
           RETURNING id`,
          [sellerId, p.id, p.name, maxHp, maxHp, JSON.stringify(p.base_stats), JSON.stringify(moves)]
        );

        const userPokemonId = upRes.rows[0].id;
        const startBid = p.base_price;
        const buyout = Math.round(p.base_price * 2.5);
        // Random duration between 30 mins to 24 hrs
        const durationHours = Math.floor(Math.random() * 6) + 1;
        const endTime = new Date(Date.now() + durationHours * 3600 * 1000);

        await db.query(
          `INSERT INTO auctions (user_pokemon_id, seller_id, start_bid, current_bid, buyout_price, end_time, status)
           VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE')`,
          [userPokemonId, sellerId, startBid, buyout, endTime]
        );
        console.log(`  Auction created: ${p.name} (${p.rarity}) starting at ${startBid} FUKU`);
      }
    }
  }

  console.log('🎉 Seeding successfully completed!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

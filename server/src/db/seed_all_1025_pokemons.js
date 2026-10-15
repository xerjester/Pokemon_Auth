const axios = require('axios');
const db = require('../config/db');
const { FALLBACK_MOVES } = require('../services/pokeapi');

async function seedAll1025Pokemons() {
  console.log('====================================================');
  console.log('🌍 Fetching ALL 1,025 Pokémon from PokéAPI into Database');
  console.log('====================================================\n');

  // 1. Get already existing IDs in DB
  const existingRes = await db.query('SELECT pokeapi_id FROM pokemons');
  const existingSet = new Set(existingRes.rows.map(r => r.pokeapi_id));
  console.log(`📊 Current registered Pokémon in DB: ${existingSet.size}`);

  const allIds = [];
  for (let i = 1; i <= 1025; i++) {
    if (!existingSet.has(i)) {
      allIds.push(i);
    }
  }

  console.log(`🚀 Need to fetch and insert: ${allIds.length} missing Pokémon\n`);
  if (allIds.length === 0) {
    console.log('🎉 All 1,025 Pokémon already exist in the database!');
    process.exit(0);
  }

  const BATCH_SIZE = 35; // Parallel concurrent requests per batch
  const totalBatches = Math.ceil(allIds.length / BATCH_SIZE);
  let totalInserted = 0;
  const startTime = Date.now();

  for (let b = 0; b < totalBatches; b++) {
    const batchIds = allIds.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchStart = Date.now();

    try {
      // Fetch batch concurrently
      const responses = await Promise.allSettled(
        batchIds.map(id => 
          axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`, { timeout: 10000 })
        )
      );

      for (const res of responses) {
        if (res.status !== 'fulfilled') continue;
        const data = res.value.data;

        const statsObj = {};
        for (const s of data.stats) {
          statsObj[s.stat.name] = s.base_stat;
        }

        const types = data.types.map(t => t.type.name);
        const sprite_url = data.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`;
        const artwork_url = data.sprites.other?.['official-artwork']?.front_default || sprite_url;

        // Extract and format top moves cleanly
        const rawMoves = (data.moves || []).slice(0, 10);
        const moves = rawMoves.map(m => {
          const moveKey = m.move.name.toLowerCase();
          if (FALLBACK_MOVES[moveKey]) {
            return FALLBACK_MOVES[moveKey];
          }
          const formattedName = m.move.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return {
            name: formattedName,
            type: types[0] || 'normal',
            power: 70,
            accuracy: 100,
            pp: 15,
            damage_class: 'physical',
            description: `A standard ${types[0] || 'normal'} attack.`
          };
        });

        // Determine Rarity
        const bst = (statsObj.hp || 50) + (statsObj.attack || 50) + (statsObj.defense || 50) + 
                    (statsObj['special-attack'] || 50) + (statsObj['special-defense'] || 50) + (statsObj.speed || 50);

        let rarity = 'Common';
        let basePrice = 500;
        if (bst >= 600 || data.id >= 1000) {
          rarity = 'Legendary';
          basePrice = 25000;
        } else if (bst >= 520) {
          rarity = 'Epic';
          basePrice = 8000;
        } else if (bst >= 420) {
          rarity = 'Rare';
          basePrice = 2500;
        }

        const baseStats = {
          hp: statsObj.hp || 50,
          attack: statsObj.attack || 50,
          defense: statsObj.defense || 50,
          special_attack: statsObj['special-attack'] || 50,
          special_defense: statsObj['special-defense'] || 50,
          speed: statsObj.speed || 50,
          bst
        };

        const capitalizedName = data.name.charAt(0).toUpperCase() + data.name.slice(1);

        await db.query(
          `INSERT INTO pokemons (pokeapi_id, name, types, base_stats, sprite_url, artwork_url, rarity, base_price, moves)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (pokeapi_id) DO NOTHING`,
          [
            data.id,
            capitalizedName,
            JSON.stringify(types),
            JSON.stringify(baseStats),
            sprite_url,
            artwork_url,
            rarity,
            basePrice,
            JSON.stringify(moves)
          ]
        );
        totalInserted++;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const batchTime = Date.now() - batchStart;
      const progress = Math.min(100, Math.round(((b + 1) / totalBatches) * 100));
      console.log(`[Batch ${b + 1}/${totalBatches} - ${progress}%] Inserted ${batchIds.length} Pokémon (${batchTime}ms) | Total so far: ${existingSet.size + totalInserted}/1025 | Elapsed: ${elapsed}s`);

      // Small pause to be polite to PokéAPI server
      await new Promise(r => setTimeout(r, 120));

    } catch (err) {
      console.error(`Error in batch ${b + 1}:`, err.message);
    }
  }

  const finalCountRes = await db.query('SELECT COUNT(*) FROM pokemons');
  console.log('\n====================================================');
  console.log(`🎉 ALL POKÉMON SEEDING COMPLETED! Total in Database: ${finalCountRes.rows[0].count} / 1,025 Pokémon!`);
  console.log('====================================================\n');
  process.exit(0);
}

seedAll1025Pokemons();

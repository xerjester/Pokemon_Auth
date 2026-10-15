const db = require('../config/db');
const { fetchPokemonFromAPI } = require('../services/pokeapi');

const ADDITIONAL_POKEMON_IDS = [
  // Gen 1
  133, // Eevee
  151, // Mew
  65,  // Alakazam
  59,  // Arcanine
  131, // Lapras
  
  // Gen 2
  249, // Lugia
  250, // Ho-Oh
  251, // Celebi
  160, // Feraligatr
  157, // Typhlosion
  
  // Gen 3
  382, // Kyogre
  257, // Blaziken
  260, // Swampert
  282, // Gardevoir
  373, // Salamence
  376, // Metagross
  
  // Gen 4
  445, // Garchomp
  487, // Giratina
  484, // Palkia
  491, // Darkrai
  493, // Arceus
  392, // Infernape
  
  // Gen 6
  658, // Greninja
  700, // Sylveon
  
  // Gen 7
  778, // Mimikyu
  
  // Gen 8
  888, // Zacian
  887, // Dragapult
  
  // Gen 9
  1007, // Koraidon
  1008  // Miraidon
];

async function seedMorePokemons() {
  console.log('⚡ Starting Pokédex Expansion Seeding...');
  let addedCount = 0;

  for (const pokeId of ADDITIONAL_POKEMON_IDS) {
    try {
      const existing = await db.query('SELECT id, name FROM pokemons WHERE pokeapi_id = $1', [pokeId]);
      if (existing.rows.length > 0) {
        console.log(`  -> Pokémon #${pokeId} (${existing.rows[0].name}) already in DB.`);
        continue;
      }

      console.log(`  -> Fetching Pokémon #${pokeId} from PokéAPI...`);
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
      console.log(`  ✅ Added #${p.pokeapi_id} ${p.name} [${p.rarity}] (${p.types.join('/')})`);
      addedCount++;
    } catch (err) {
      console.warn(`  ⚠️ Could not fetch #${pokeId}:`, err.message);
    }
  }

  const countRes = await db.query('SELECT COUNT(*) FROM pokemons');
  console.log(`\n🎉 Seeding Finished! Added ${addedCount} new Pokémon. Total in Pokédex: ${countRes.rows[0].count} Pokémon.`);
  process.exit(0);
}

seedMorePokemons();

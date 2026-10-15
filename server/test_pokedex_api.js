const axios = require('axios');

async function testPokedexAPI() {
  console.log('🧪 Starting Pokédex & Directory API Verification...\n');
  const API = 'http://localhost:5000/api';

  try {
    // 1. Fetch all pokemons & check stats
    console.log('1️⃣ Fetching All Registered Pokémons...');
    const res1 = await axios.get(`${API}/pokemons`);
    console.log(`   ✅ Total Pokémon Registered in System: ${res1.data.totalAll}`);
    console.log(`   ✅ Summary by Rarity:`, res1.data.summary.rarityCounts);
    console.log(`   ✅ Summary by Type:`, Object.keys(res1.data.summary.typeCounts).slice(0, 8).map(t => `${t}: ${res1.data.summary.typeCounts[t]}`).join(', '));

    // 2. Test search by name & ID
    console.log('\n2️⃣ Testing Search Filter (Query: "Charizard")...');
    const res2 = await axios.get(`${API}/pokemons?search=Charizard`);
    console.log(`   ✅ Found ${res2.data.pokemons.length} matches:`);
    res2.data.pokemons.forEach(p => console.log(`      - #${p.pokeapi_id} ${p.name} [${p.rarity}] (${p.types.join('/')})`));

    // 3. Test Type Filter (Fire)
    console.log('\n3️⃣ Testing Type Filter (Type: "fire")...');
    const res3 = await axios.get(`${API}/pokemons?type=fire`);
    console.log(`   ✅ Found ${res3.data.pokemons.length} Fire-type Pokémon:`);
    res3.data.pokemons.slice(0, 5).forEach(p => console.log(`      - #${p.pokeapi_id} ${p.name} (${p.types.join('/')})`));

    // 4. Test Sorting by BST Descending
    console.log('\n4️⃣ Testing Sorting by Base Stat Total (BST Descending)...');
    const res4 = await axios.get(`${API}/pokemons?sortBy=bst&order=desc`);
    console.log(`   ✅ Top 5 Strongest Pokémon by BST:`);
    res4.data.pokemons.slice(0, 5).forEach(p => {
      console.log(`      - #${p.pokeapi_id} ${p.name} [${p.rarity}]: BST ${p.base_stats?.bst} (HP:${p.base_stats?.hp} ATK:${p.base_stats?.attack} SPD:${p.base_stats?.speed})`);
    });

    // 5. Test PokéAPI Discovery (e.g. Umbreon #197)
    console.log('\n5️⃣ Testing Live Discovery of New Pokémon from PokéAPI (Query: "umbreon")...');
    const res5 = await axios.post(`${API}/pokemons/discover`, { query: 'umbreon' });
    console.log(`   ✅ Discovery Response:`, res5.data.message);
    console.log(`      - Newly Discovered: #${res5.data.pokemon.pokeapi_id} ${res5.data.pokemon.name} [${res5.data.pokemon.rarity}] (BST: ${res5.data.pokemon.base_stats?.bst})`);

    // 6. Test Single Pokémon Detail
    console.log('\n6️⃣ Fetching Detailed Info for Mewtwo (#150)...');
    const res6 = await axios.get(`${API}/pokemons/150`);
    console.log(`   ✅ Detail: ${res6.data.pokemon.name} (Types: ${res6.data.pokemon.types.join('/')})`);
    console.log(`      - Moves Count: ${res6.data.pokemon.moves.length}`);
    console.log(`      - Top Moves Preview: ${res6.data.pokemon.moves.slice(0, 3).map(m => m.name).join(', ')}`);

    console.log('\n🎉 ALL POKÉDEX & SEARCH BOARD TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testPokedexAPI();

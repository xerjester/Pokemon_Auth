const axios = require('axios');

async function testFullJourney() {
  console.log('🧪 Starting Full Automated Journey Verification...\n');
  const API = 'http://localhost:5000/api';

  // 1. Health check
  console.log('1️⃣ Checking API Health...');
  const healthRes = await axios.get(`${API}/health`);
  console.log('   ✅ Health Status:', healthRes.data);

  // 2. Contract Info
  console.log('\n2️⃣ Checking Smart Contract Info...');
  const contractRes = await axios.get(`${API}/web3/contract-info`);
  console.log('   ✅ Token:', contractRes.data.symbol, '| Address:', contractRes.data.contractAddress, '| Decimals:', contractRes.data.decimals);

  // 3. User Login
  console.log('\n3️⃣ Logging in as Ash Ketchum...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    usernameOrEmail: 'ash_ketchum',
    password: 'pika1234'
  });
  const token = loginRes.data.token;
  console.log('   ✅ Logged in! Ash Balance:', loginRes.data.user.fuku_balance, 'FUKU');

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 4. View Auctions
  console.log('\n4️⃣ Fetching Active Pokémon Auctions...');
  const aucRes = await axios.get(`${API}/auctions`);
  const auctions = aucRes.data.auctions;
  console.log(`   ✅ Found ${auctions.length} active auctions:`);
  auctions.slice(0, 3).forEach(a => {
    console.log(`      - ${a.name} (${a.rarity}) | Current Bid: ${a.current_bid} FUKU | Ends in: ${Math.round(a.seconds_remaining)}s`);
  });

  // 5. Place Bid
  const targetAuction = auctions[0];
  console.log(`\n5️⃣ Placing Bid on ${targetAuction.name} (Auction #${targetAuction.id})...`);
  const bidAmount = parseFloat(targetAuction.current_bid) + 500;
  const bidRes = await axios.post(`${API}/auctions/${targetAuction.id}/bid`, {
    amount: bidAmount
  }, authHeaders);
  console.log('   ✅ Bid response:', bidRes.data.message, '| New Ash Balance:', bidRes.data.newBalance, 'FUKU');

  // 6. Check Inventory
  console.log('\n6️⃣ Checking Ash\'s Pokémon Inventory...');
  const invRes = await axios.get(`${API}/inventory`, authHeaders);
  const userMons = invRes.data.pokemons;
  console.log(`   ✅ Ash owns ${userMons.length} Pokémon:`);
  userMons.forEach(p => {
    console.log(`      - [${p.is_in_team ? `Team Slot ${p.team_position}` : 'Storage'}] ${p.nickname || p.name} (Lv.${p.level}) | Moves: ${p.moves.map(m => m.name).join(', ')}`);
  });

  // 7. Custom Skills from PokéAPI
  const pikachu = userMons.find(p => p.name === 'Pikachu');
  if (pikachu) {
    console.log(`\n7️⃣ Fetching PokéAPI Movepool for ${pikachu.name}...`);
    const moveRes = await axios.get(`${API}/skills/moves/${pikachu.id}`, authHeaders);
    console.log(`   ✅ Loaded ${moveRes.data.availableMoves.length} moves from PokéAPI`);

    // Equip 4 custom moves
    console.log('   Equipping custom 4 moveset: Volt Tackle, Thunderbolt, Iron Tail, Quick Attack...');
    const equipRes = await axios.post(`${API}/skills/equip`, {
      userPokemonId: pikachu.id,
      selectedMoves: [
        { name: 'Volt Tackle', type: 'electric', power: 120, accuracy: 100, pp: 5, damage_class: 'physical' },
        { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, damage_class: 'special' },
        { name: 'Iron Tail', type: 'steel', power: 100, accuracy: 75, pp: 15, damage_class: 'physical' },
        { name: 'Body Slam', type: 'normal', power: 85, accuracy: 100, pp: 15, damage_class: 'physical' }
      ]
    }, authHeaders);
    console.log('   ✅ Equip response:', equipRes.data.message);
  }

  // 8. Turn-Based Gym Challenge against Brock
  console.log('\n8️⃣ Starting Turn-Based Battle against Brock (Pewter Gym)...');
  const battleStartRes = await axios.post(`${API}/battle/start`, { gymId: 'brock' }, authHeaders);
  let battle = battleStartRes.data.battle;
  console.log('   ✅ Battle started!');
  console.log('   🏟️ Opponent:', battle.opponentTeam[0].name, `(HP: ${battle.opponentTeam[0].hp}/${battle.opponentTeam[0].maxHp})`);
  console.log('   ⚡ Active Pokémon:', battle.userTeam[0].nickname, `(HP: ${battle.userTeam[0].hp}/${battle.userTeam[0].maxHp})`);

  // Execute Turn 1
  console.log('\n9️⃣ Executing Turn 1: Attack with Iron Tail (Steel move against Rock type)...');
  const turn1Res = await axios.post(`${API}/battle/action`, {
    action: 'attack',
    moveIndex: 2 // Iron Tail
  }, authHeaders);
  console.log('   Turn Logs:');
  turn1Res.data.turnLogs.forEach(l => console.log('     ', l));

  // 10. Claim Faucet
  console.log('\n🔟 Testing Faucet Claim...');
  const faucetRes = await axios.post(`${API}/auth/claim-faucet`, {}, authHeaders);
  console.log('   ✅ Faucet response:', faucetRes.data.message, '| Ash Balance:', faucetRes.data.newBalance, 'FUKU');

  // 11. Test Frontend HTTP response
  console.log('\n1️⃣1️⃣ Verifying Frontend at http://localhost:5173...');
  const clientHtml = await axios.get('http://localhost:5173');
  console.log('   ✅ Client HTML loaded successfully! Status:', clientHtml.status);

  console.log('\n🎉 ALL FULLSTACK SYSTEM TESTS PASSED 100%!');
  process.exit(0);
}

testFullJourney().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});

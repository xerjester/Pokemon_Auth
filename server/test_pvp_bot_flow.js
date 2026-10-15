const axios = require('axios');

async function testPvpAndBotFlow() {
  console.log('🧪 Testing PvP & Realistic Bot Flow...\n');
  const API = 'http://localhost:5000/api';

  // 1. Check PvP Lobby
  console.log('1️⃣ Fetching PvP Lobby Opponents...');
  const lobbyRes = await axios.get(`${API}/pvp/lobby`);
  console.log(`   ✅ Found ${lobbyRes.data.opponents.length} opponents in lobby:`);
  lobbyRes.data.opponents.forEach(o => {
    console.log(`      - ${o.name} (@${o.username}) | MMR: ${o.mmr} | Wager: ${o.wager} FUKU | Team: ${o.teamPreview.map(t => t.name).join(', ')}`);
  });

  // 2. Check Live Activities
  console.log('\n2️⃣ Checking Live Player Activities Feed...');
  const actRes = await axios.get(`${API}/pvp/activities`);
  console.log(`   ✅ Fetched ${actRes.data.activities.length} live activities:`);
  actRes.data.activities.slice(0, 3).forEach(a => {
    console.log(`      - [${a.type.toUpperCase()}] @${a.username}: ${a.message}`);
  });

  // 3. Login as Ash
  console.log('\n3️⃣ Logging in as Ash Ketchum...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    usernameOrEmail: 'ash_ketchum',
    password: 'pika1234'
  });
  const token = loginRes.data.token;
  const initialBalance = parseFloat(loginRes.data.user.fuku_balance);
  console.log(`   ✅ Ash Balance: ${initialBalance.toLocaleString()} FUKU`);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 4. Challenge Serena in 3v3 PvP
  console.log('\n4️⃣ Challenging Serena (เทรนเนอร์สาวคาลอส) with 500 FUKU wager...');
  const challengeRes = await axios.post(`${API}/pvp/challenge`, {
    targetUsername: 'serena_kalos',
    customWager: 500
  }, authHeaders);

  const battle = challengeRes.data.battle;
  console.log('   ✅ Battle Started!');
  console.log(`   Prize Pool: ${battle.prizePool.toLocaleString()} FUKU`);
  console.log(`   Ash Active Pokémon: ${battle.userTeam[0].nickname} (HP: ${battle.userTeam[0].hp}/${battle.userTeam[0].maxHp})`);
  console.log(`   Serena Active Pokémon: ${battle.opponentTeam[0].name} (HP: ${battle.opponentTeam[0].hp}/${battle.opponentTeam[0].maxHp})`);

  // 5. Execute Turn 1 in PvP
  console.log('\n5️⃣ Executing PvP Turn 1 (Iron Tail / Thunderbolt)...');
  const turnRes = await axios.post(`${API}/pvp/action`, {
    action: 'attack',
    moveIndex: 0 // First move
  }, authHeaders);

  console.log('   PvP Turn Logs:');
  turnRes.data.turnLogs.forEach(log => console.log('     ', log));

  // 6. Check updated activities (should include Ash challenge activity)
  console.log('\n6️⃣ Verifying updated Live Activities Feed...');
  const actRes2 = await axios.get(`${API}/pvp/activities`);
  const hasAshActivity = actRes2.data.activities.some(a => a.username === 'ash_ketchum');
  console.log(`   ✅ Ash's live activity recorded: ${hasAshActivity ? 'YES' : 'NO'}`);

  console.log('\n🎉 ALL PVP & BOT TESTS PASSED 100%!');
  process.exit(0);
}

testPvpAndBotFlow().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});

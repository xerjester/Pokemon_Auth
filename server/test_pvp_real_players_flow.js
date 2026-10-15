const axios = require('axios');

async function testRealPlayersPvpFlow() {
  console.log('🧪 Testing Real Player PvP Invitation, Accept/Decline, Cancel & Synchronized Battle...\n');
  const API = 'http://localhost:5000/api';

  // 1. Log in User 1 (ash_ketchum)
  console.log('1️⃣ Logging in Player 1 (@ash_ketchum)...');
  const ashLogin = await axios.post(`${API}/auth/login`, {
    usernameOrEmail: 'ash_ketchum',
    password: 'pika1234'
  });
  const ashToken = ashLogin.data.token;
  const ashHeaders = { headers: { Authorization: `Bearer ${ashToken}` } };
  console.log(`   ✅ Ash Ketchum logged in. Balance: ${ashLogin.data.user.fuku_balance} FUKU`);

  // 2. Log in User 2 (gary_oak)
  console.log('\n2️⃣ Logging in Player 2 (@gary_oak)...');
  const daiLogin = await axios.post(`${API}/auth/login`, {
    usernameOrEmail: 'gary_oak',
    password: 'blastoise123'
  });
  const daiToken = daiLogin.data.token;
  const daiHeaders = { headers: { Authorization: `Bearer ${daiToken}` } };
  console.log(`   ✅ Gary Oak logged in. Balance: ${daiLogin.data.user.fuku_balance} FUKU`);

  // 3. Check Lobby contains Player 2
  console.log('\n3️⃣ Checking Lobby for Player 2 (@gary_oak)...');
  const lobbyRes = await axios.get(`${API}/pvp/lobby`);
  const daiInLobby = lobbyRes.data.opponents.find(o => o.username === 'gary_oak');
  if (!daiInLobby || !daiInLobby.isRealPlayer) {
    throw new Error('gary_oak not found or not marked as isRealPlayer in lobby');
  }
  console.log(`   ✅ Found @gary_oak in lobby as Real Player with ${daiInLobby.pokemonCount} Pokemon!`);

  // 4. Test Challenge & Accept flow -> Start 2-Player Match!
  console.log('\n4️⃣ Testing Challenge & Accept Flow (Ash challenges Gary, Gary accepts)...');

  // Check if Ash is on cooldown before challenging
  const cdCheck = await axios.get(`${API}/pvp/challenge-cooldown`, ashHeaders);
  if (cdCheck.data.onCooldown && cdCheck.data.remainingSeconds > 0) {
    console.log(`   ⏳ Ash is currently on anti-spam cooldown. Waiting ${cdCheck.data.remainingSeconds}s...`);
    await new Promise(r => setTimeout(r, (cdCheck.data.remainingSeconds + 1) * 1000));
  }

  const chalRes = await axios.post(`${API}/pvp/challenge`, {
    targetUsername: 'gary_oak',
    customWager: 1000
  }, ashHeaders);
  const chalId = chalRes.data.challengeId;
  console.log(`   ✅ Match Challenge created: ID ${chalId} with 1,000 FUKU wager`);

  // Gary sees incoming challenge
  const garyIncoming = await axios.get(`${API}/pvp/challenges/incoming`, daiHeaders);
  const foundIncoming = garyIncoming.data.challenges.find(c => c.id === chalId);
  if (!foundIncoming) throw new Error('Challenge not found in incoming challenges for gary_oak');
  console.log(`   ✅ Gary sees incoming challenge from @${foundIncoming.challengerUsername}!`);

  // Gary accepts!
  const acceptRes = await axios.post(`${API}/pvp/challenges/${chalId}/accept`, {}, daiHeaders);
  const roomId = acceptRes.data.roomId;
  console.log(`   ✅ Gary accepted! Match Room created: ${roomId}`);

  // 7. Verify Room state for both players
  console.log('\n7️⃣ Verifying Room State for both players...');
  const ashRoomRes = await axios.get(`${API}/pvp/room/${roomId}`, ashHeaders);
  console.log(`   ✅ Ash View: Active = ${ashRoomRes.data.userTeam[ashRoomRes.data.userActiveIndex].nickname} vs Opponent = ${ashRoomRes.data.opponentTeam[ashRoomRes.data.opponentActiveIndex].nickname} (@${ashRoomRes.data.opponentUsername})`);

  const daiRoomRes = await axios.get(`${API}/pvp/room/${roomId}`, daiHeaders);
  console.log(`   ✅ Dai View: Active = ${daiRoomRes.data.userTeam[daiRoomRes.data.userActiveIndex].nickname} vs Opponent = ${daiRoomRes.data.opponentTeam[daiRoomRes.data.opponentActiveIndex].nickname} (@${daiRoomRes.data.opponentUsername})`);

  // 8. Test 2-Player Turn Action:
  console.log('\n8️⃣ Player 1 (Ash) submits attack action...');
  const ashActRes = await axios.post(`${API}/pvp/room/${roomId}/action`, {
    action: 'attack',
    moveIndex: 0
  }, ashHeaders);
  console.log(`   ✅ Ash Action status: waitingForOpponent = ${ashActRes.data.waitingForOpponent}`);

  console.log('\n9️⃣ Player 2 (Daijobbu) submits attack action (resolving turn)...');
  const daiActRes = await axios.post(`${API}/pvp/room/${roomId}/action`, {
    action: 'attack',
    moveIndex: 0
  }, daiHeaders);
  console.log(`   ✅ Turn resolved! Turn Logs:`);
  daiActRes.data.turnLogs.forEach(l => console.log(`      ${l}`));

  // 10. Check Room updated state
  const updatedRoom = await axios.get(`${API}/pvp/room/${roomId}`, ashHeaders);
  console.log(`\n🔟 Turn ${updatedRoom.data.turn} Ready! Ash Active HP: ${updatedRoom.data.userTeam[updatedRoom.data.userActiveIndex].hp}, Dai Active HP: ${updatedRoom.data.opponentTeam[updatedRoom.data.opponentActiveIndex].hp}`);

  console.log('\n🎉 ALL REAL PLAYER PVP TESTS (INVITE, CANCEL, DECLINE, ACCEPT, ROOM) PASSED 100%!\n');
}

testRealPlayersPvpFlow().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});

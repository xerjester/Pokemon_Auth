const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function runTest() {
  console.log('=== TESTING PVP CHALLENGER COOLDOWN & GLOBAL CHALLENGE FLOW ===\n');

  try {
    // 1. Login Ash
    console.log('1. Logging in as Ash Ketchum...');
    const ashLogin = await axios.post(`${API_BASE}/auth/login`, {
      usernameOrEmail: 'ash_ketchum',
      password: 'pika1234'
    });
    const ashToken = ashLogin.data.token;
    console.log('   Ash logged in! Token acquired.\n');

    // 2. Login Gary
    console.log('2. Logging in as Gary Oak...');
    const garyLogin = await axios.post(`${API_BASE}/auth/login`, {
      usernameOrEmail: 'gary_oak',
      password: 'blastoise123'
    });
    const garyToken = garyLogin.data.token;
    console.log('   Gary logged in! Token acquired.\n');

    // 3. Check Ash Initial Cooldown
    console.log('3. Checking Ash initial cooldown status...');
    const initialCooldown = await axios.get(`${API_BASE}/pvp/challenge-cooldown`, {
      headers: { Authorization: `Bearer ${ashToken}` }
    });
    console.log('   Initial cooldown response:', initialCooldown.data);

    // 4. Ash sends challenge to Gary
    console.log('4. Ash sending challenge to Gary (wager: 1000 FUKU)...');
    const challengeRes = await axios.post(`${API_BASE}/pvp/challenge`, {
      opponentUsername: 'gary_oak',
      wager: 1000
    }, {
      headers: { Authorization: `Bearer ${ashToken}` }
    });
    console.log('   Challenge Response:', challengeRes.data);
    const challengeId = challengeRes.data.challengeId;

    // 5. Check Ash Cooldown immediately after challenge
    console.log('\n5. Checking Ash cooldown status after sending challenge...');
    const activeCooldown = await axios.get(`${API_BASE}/pvp/challenge-cooldown`, {
      headers: { Authorization: `Bearer ${ashToken}` }
    });
    console.log('   Active cooldown response:', activeCooldown.data);
    if (!activeCooldown.data.onCooldown || activeCooldown.data.remainingSeconds <= 0) {
      throw new Error('Expected Ash to be on cooldown, but got: ' + JSON.stringify(activeCooldown.data));
    }
    console.log(`   PASS: Ash is on cooldown with ${activeCooldown.data.remainingSeconds}s remaining!\n`);

    // 6. Ash attempts to spam send another challenge
    console.log('6. Ash attempts to spam send another challenge to Gary while on cooldown...');
    try {
      await axios.post(`${API_BASE}/pvp/challenge`, {
        opponentUsername: 'gary_oak',
        wager: 1000
      }, {
        headers: { Authorization: `Bearer ${ashToken}` }
      });
      throw new Error('Spam challenge should have been blocked by cooldown!');
    } catch (err) {
      if (err.response && err.response.status === 429) {
        console.log(`   PASS: Blocked with HTTP 429! Error: "${err.response.data.error}" (Remaining: ${err.response.data.remainingSeconds}s)\n`);
      } else if (err.response && err.response.status === 400) {
        console.log(`   PASS: Blocked with HTTP 400! Error: "${err.response.data.error}"\n`);
      } else {
        throw err;
      }
    }

    // 7. Gary checks incoming challenges (simulating global modal on any page)
    console.log('7. Gary polling incoming challenges across any page...');
    const incomingRes = await axios.get(`${API_BASE}/pvp/challenges/incoming`, {
      headers: { Authorization: `Bearer ${garyToken}` }
    });
    console.log(`   Incoming challenges count for Gary: ${incomingRes.data.challenges.length}`);
    const found = incomingRes.data.challenges.find(c => c.id === challengeId);
    if (!found) {
      throw new Error(`Challenge ${challengeId} not found in Gary's incoming list!`);
    }
    console.log(`   PASS: Found incoming challenge from @${found.challengerUsername} for ${found.wager} FUKU!\n`);

    // 8. Gary declines the challenge
    console.log('8. Gary declining the challenge...');
    await axios.post(`${API_BASE}/pvp/challenges/${challengeId}/decline`, {}, {
      headers: { Authorization: `Bearer ${garyToken}` }
    });
    console.log('   Declined successfully!\n');

    // 9. Ash checks challenge status
    console.log('9. Ash checking challenge status...');
    const statusRes = await axios.get(`${API_BASE}/pvp/challenges/${challengeId}/status`, {
      headers: { Authorization: `Bearer ${ashToken}` }
    });
    console.log('   Challenge status:', statusRes.data.status);
    if (statusRes.data.status !== 'DECLINED') {
      throw new Error(`Expected status DECLINED but got ${statusRes.data.status}`);
    }
    console.log('   PASS: Status is DECLINED!\n');

    // 10. Verify Ash is still in cooldown to prevent spamming
    console.log('10. Verifying Ash is still on cooldown after decline...');
    const cooldownAfterDecline = await axios.get(`${API_BASE}/pvp/challenge-cooldown`, {
      headers: { Authorization: `Bearer ${ashToken}` }
    });
    console.log('   Cooldown after decline:', cooldownAfterDecline.data);
    if (!cooldownAfterDecline.data.onCooldown) {
      throw new Error('Ash should still be on 1-minute cooldown even after challenge is declined!');
    }
    console.log(`   PASS: Cooldown persists (${cooldownAfterDecline.data.remainingSeconds}s remaining) - anti-spam active!\n`);

    console.log('=== ALL COOLDOWN & GLOBAL CHALLENGE TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runTest();

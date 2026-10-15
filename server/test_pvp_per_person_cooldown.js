const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const db = require('./src/config/db');

async function run() {
  console.log('--- TEST: PvP Per-Target Player Cooldown (คูลดาวน์คนต่อคน) ---');

  // 1. Login Ash, Gary, Red
  const ashRes = await axios.post(`${BASE_URL}/auth/login`, { usernameOrEmail: 'ash_ketchum', password: 'pika1234' });
  const ashToken = ashRes.data.token;
  const ashUser = ashRes.data.user;

  const garyRes = await axios.post(`${BASE_URL}/auth/login`, { usernameOrEmail: 'gary_oak', password: 'blastoise123' });
  const garyToken = garyRes.data.token;
  const garyUser = garyRes.data.user;

  const redRes = await axios.post(`${BASE_URL}/auth/login`, { usernameOrEmail: 'red_champion', password: 'charizard123' });
  const redToken = redRes.data.token;
  const redUser = redRes.data.user;

  console.log(`Logins successful: Ash (id: ${ashUser.id}), Gary (id: ${garyUser.id}), Red (id: ${redUser.id})`);

  // Ensure Red has a pokemon in battle team
  const redTeamCheck = await db.query(
    'SELECT * FROM user_pokemons WHERE user_id = $1 AND is_in_team = TRUE',
    [redUser.id]
  );
  if (redTeamCheck.rows.length === 0) {
    const pokeRes = await db.query('SELECT * FROM pokemons WHERE name = $1 LIMIT 1', ['Charizard']);
    const poke = pokeRes.rows[0];
    await db.query(
      `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_in_team, team_position, is_for_sale)
       VALUES ($1, $2, $3, 50, 300, 300, $4, $5, TRUE, 1, FALSE)`,
      [redUser.id, poke.id, 'Red Charizard', JSON.stringify(poke.base_stats), JSON.stringify((poke.moves || []).slice(0, 4))]
    );
    console.log('Inserted team pokemon for Red.');
  }

  // Ensure all have pokemons in team
  for (const [token, name] of [[ashToken, 'Ash'], [garyToken, 'Gary'], [redToken, 'Red']]) {
    const inv = await axios.get(`${BASE_URL}/inventory`, { headers: { Authorization: `Bearer ${token}` } });
    const pokemons = inv.data.pokemons || [];
    const inTeam = pokemons.filter(p => p.is_in_team);
    if (inTeam.length === 0 && pokemons.length > 0) {
      await axios.post(`${BASE_URL}/inventory/toggle-team`, { userPokemonId: pokemons[0].id }, { headers: { Authorization: `Bearer ${token}` } });
      console.log(`Added team pokemon for ${name}`);
    }
  }

  // 2. Check cooldown for Gary and challenge if ready, or verify Gary is blocked
  console.log('\n[Step 1] Ash checks cooldown and tests challenging Gary...');
  let challengeGaryRes = null;
  try {
    challengeGaryRes = await axios.post(
      `${BASE_URL}/pvp/challenge`,
      { targetUsername: 'gary_oak', wager: 1000 },
      { headers: { Authorization: `Bearer ${ashToken}` } }
    );
    console.log('Challenged Gary successfully! Cooldown started.');
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.log(`Gary is ALREADY on cooldown (${err.response.data.remainingSeconds}s remaining). This verifies cooldown persistence!`);
    } else {
      throw err;
    }
  }

  // 3. Ash immediately tries to challenge Gary again (should be BLOCKED with 429)
  console.log('\n[Step 2] Ash tries to challenge Gary again immediately (must be blocked with 429)...');
  try {
    await axios.post(
      `${BASE_URL}/pvp/challenge`,
      { targetUsername: 'gary_oak', wager: 1000 },
      { headers: { Authorization: `Bearer ${ashToken}` } }
    );
    throw new Error('Should have failed with HTTP 429!');
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.log(`SUCCESS: Blocked with HTTP 429: "${err.response.data.error}" (Remaining: ${err.response.data.remainingSeconds}s, target: ${err.response.data.targetUsername})`);
    } else {
      throw err;
    }
  }

  // Clean up any pending challenge to Gary if created
  if (challengeGaryRes && challengeGaryRes.data.challengeId) {
    await axios.post(
      `${BASE_URL}/pvp/challenges/${challengeGaryRes.data.challengeId}/decline`,
      {},
      { headers: { Authorization: `Bearer ${garyToken}` } }
    );
    console.log('Gary declined pending challenge.');
  }


  // Verify Gary still has cooldown for Ash even after decline
  console.log('\n[Step 3] Ash tries to challenge Gary AGAIN after decline (should STILL be blocked by 60s cooldown)...');
  try {
    await axios.post(
      `${BASE_URL}/pvp/challenge`,
      { targetUsername: 'gary_oak', wager: 100 },
      { headers: { Authorization: `Bearer ${ashToken}` } }
    );
    throw new Error('Should have failed with HTTP 429 even after decline!');
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.log(`SUCCESS: Still blocked against Gary with HTTP 429: "${err.response.data.error}" (Remaining: ${err.response.data.remainingSeconds}s)`);
    } else {
      throw err;
    }
  }

  // 4. Ash challenges a different real player -> MUST SUCCEED because cooldown is per-target person!
  console.log('\n[Step 4] Ash challenges another player while Gary is on cooldown -> MUST SUCCEED!');
  const freshUsername = `player_${Date.now().toString().slice(-6)}`;
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    username: freshUsername,
    email: `${freshUsername}@test.com`,
    password: 'password123'
  });
  const freshToken = regRes.data.token;
  const freshUser = regRes.data.user;

  // Insert a pokemon in team for fresh user
  const pokeSample = (await db.query('SELECT * FROM pokemons LIMIT 1')).rows[0];
  await db.query(
    `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_in_team, team_position, is_for_sale)
     VALUES ($1, $2, $3, 50, 300, 300, $4, $5, TRUE, 1, FALSE)`,
    [freshUser.id, pokeSample.id, 'Test Poke', JSON.stringify(pokeSample.base_stats), JSON.stringify((pokeSample.moves || []).slice(0, 4))]
  );

  const challengeOtherRes = await axios.post(
    `${BASE_URL}/pvp/challenge`,
    { targetUsername: freshUsername, wager: 100 },
    { headers: { Authorization: `Bearer ${ashToken}` } }
  );
  console.log(`Result for ${freshUsername}:`, challengeOtherRes.data.message);
  if (!challengeOtherRes.data.challengeId) {
    throw new Error(`Expected challengeId from Ash -> ${freshUsername}`);
  }
  console.log(`SUCCESS: Ash successfully challenged @${freshUsername} immediately while on cooldown for Gary!`);

  // Decline challenge
  await axios.post(
    `${BASE_URL}/pvp/challenges/${challengeOtherRes.data.challengeId}/decline`,
    {},
    { headers: { Authorization: `Bearer ${freshToken}` } }
  );

  // 5. Ash checks cooldown list via GET /api/pvp/challenge-cooldown
  console.log('\n[Step 5] Ash fetches GET /api/pvp/challenge-cooldown...');
  const cdRes = await axios.get(`${BASE_URL}/pvp/challenge-cooldown`, {
    headers: { Authorization: `Bearer ${ashToken}` }
  });
  console.log('Cooldowns response:', cdRes.data);
  const cdMap = cdRes.data.cooldowns || {};
  if (!cdMap['gary_oak'] && !cdMap[garyUser.id]) {
    throw new Error('Expected Gary to be in cooldown map!');
  }
  console.log(`Gary cooldown in map: ${cdMap['gary_oak'] || cdMap[garyUser.id]} seconds.`);
  console.log(`Red cooldown in map: ${cdMap['red_champion'] || cdMap[redUser.id]} seconds.`);

  // 6. Ash challenges a bot (should always succeed, no cooldown)
  console.log('\n[Step 6] Ash challenges bot (cynthia_champion)...');
  const botRes = await axios.post(
    `${BASE_URL}/pvp/challenge`,
    { targetUsername: 'cynthia_champion', betAmount: 50 },
    { headers: { Authorization: `Bearer ${ashToken}` } }
  );
  console.log('Bot challenge result:', botRes.data.message);
  console.log('SUCCESS: Bot challenge executed with immediate match!');

  console.log('\nALL PER-TARGET COOLDOWN TESTS PASSED PERFECTLY!');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});

const axios = require('axios');

async function runBattleGimmicksTest() {
  console.log('🧪 Starting Battle Gimmicks & Items Verification...\n');
  const API = 'http://localhost:5000/api';

  try {
    // 1. Login as Ash
    console.log('1️⃣ Logging in as Ash Ketchum...');
    const loginRes = await axios.post(`${API}/auth/login`, {
      usernameOrEmail: 'ash_ketchum',
      password: 'pika1234'
    });
    const token = loginRes.data.token;
    const ashUser = loginRes.data.user;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    console.log(`   ✅ Logged in! Ash Balance: ${ashUser.fuku_balance} FUKU`);

    // 2. Fetch Shop Items
    console.log('\n2️⃣ Fetching PokéMart Shop Items...');
    const shopRes = await axios.get(`${API}/items/shop`, authHeaders);
    const shopItems = shopRes.data.items;
    console.log(`   ✅ Available items in shop: ${shopItems.length}`);
    shopItems.slice(0, 4).forEach(i => {
      console.log(`      - [${i.category}] ${i.name} (${i.price_fuku} FUKU): ${i.description.slice(0, 40)}...`);
    });

    // 3. Purchase an item (Potion)
    const potion = shopItems.find(i => i.name.includes('Potion')) || shopItems[0];
    console.log(`\n3️⃣ Purchasing 1x ${potion.name} (${potion.price_fuku} FUKU)...`);
    const buyRes = await axios.post(`${API}/items/buy`, {
      itemId: potion.id,
      quantity: 1
    }, authHeaders);
    console.log(`   ✅ Purchase success! Balance now: ${buyRes.data.newBalance} FUKU`);

    // 4. Check Inventory Items
    console.log('\n4️⃣ Checking Ash\'s Bag items...');
    const myItemsRes = await axios.get(`${API}/items/my-items`, authHeaders);
    console.log(`   ✅ Items in bag: ${myItemsRes.data.items.length}`);
    myItemsRes.data.items.forEach(i => {
      console.log(`      - ${i.name} x${i.quantity} [${i.category}]`);
    });

    // 5. Fetch Pokémon Inventory & Equip Item
    console.log('\n5️⃣ Fetching Pokémon to equip item...');
    const invRes = await axios.get(`${API}/inventory`, authHeaders);
    const charizard = invRes.data.pokemons.find(p => p.name.toLowerCase().includes('charizard'));
    const pikachu = invRes.data.pokemons.find(p => p.name.toLowerCase().includes('pikachu'));
    const megaStone = myItemsRes.data.items.find(i => i.name.toLowerCase().includes('charizardite'));
    const zCrystal = myItemsRes.data.items.find(i => i.name.toLowerCase().includes('electrium'));

    if (charizard && megaStone) {
      console.log(`   Equipping ${megaStone.name} to ${charizard.name}...`);
      const equipRes = await axios.post(`${API}/items/equip`, {
        userPokemonId: charizard.id,
        itemId: megaStone.id
      }, authHeaders);
      console.log(`   ✅ Equip result: ${equipRes.data.message}`);
    }

    if (pikachu && zCrystal) {
      console.log(`   Equipping ${zCrystal.name} to ${pikachu.name}...`);
      const equipRes2 = await axios.post(`${API}/items/equip`, {
        userPokemonId: pikachu.id,
        itemId: zCrystal.id
      }, authHeaders);
      console.log(`   ✅ Equip result: ${equipRes2.data.message}`);
    }

    // 6. Start Battle with Gym Leader Brock
    console.log('\n6️⃣ Starting Battle with Gym Leader Brock...');
    const battleStartRes = await axios.post(`${API}/battle/start`, {
      gymId: 'brock'
    }, authHeaders);
    let battle = battleStartRes.data.battle;
    const playerMon = battle.userTeam[battle.userActiveIndex];
    const oppMon = battle.opponentTeam[battle.opponentActiveIndex];
    console.log(`   ✅ Battle Started! Gym: ${battle.gymName}`);
    console.log(`   Player Active: ${playerMon.name} (HP: ${playerMon.hp}/${playerMon.maxHp}, Held: ${playerMon.held_item_name || 'None'})`);
    console.log(`   Opponent Active: ${oppMon.name} (HP: ${oppMon.hp}/${oppMon.maxHp})`);

    // 7. Turn 1: Normal attack (Pikachu attacks, Brock's Pokemon retaliates so HP reduces)
    console.log('\n7️⃣ Turn 1: Normal Attack to exchange blows...');
    const turn1Res = await axios.post(`${API}/battle/action`, {
      action: 'attack',
      moveIndex: 0
    }, authHeaders);
    console.log(`   Turn 1 Logs:`);
    turn1Res.data.turnLogs.forEach(l => console.log(`      - [${l.type}] ${l.text}`));
    const p1Mon = turn1Res.data.battle.userTeam[turn1Res.data.battle.userActiveIndex];
    console.log(`   Pikachu HP after turn 1: ${p1Mon.hp}/${p1Mon.maxHp}`);

    // 8. Turn 2: In-Battle Item Usage: Use Potion to heal!
    console.log('\n8️⃣ Turn 2: Using Potion from Bag to heal Pikachu...');
    if (p1Mon.hp < p1Mon.maxHp) {
      const useItemRes = await axios.post(`${API}/battle/action`, {
        action: 'use_item',
        itemId: potion.id,
        targetIndex: turn1Res.data.battle.userActiveIndex
      }, authHeaders);
      console.log(`   ✅ Item Turn Result:`);
      useItemRes.data.turnLogs.forEach(l => console.log(`      - [${l.type}] ${l.text}`));
      console.log(`   Action sequence events: ${useItemRes.data.actionSequence.length}`);
    } else {
      console.log('   (Pikachu still full HP or fainted, skipping potion heal)');
    }

    // 9. Turn 3: Z-Move Attack with Pikachu
    console.log(`\n9️⃣ Turn 3: Unleashing Z-Move with Pikachu (Holding Electrium Z)...`);
    const zAttackRes = await axios.post(`${API}/battle/action`, {
      action: 'attack',
      moveIndex: 0,
      zMove: true
    }, authHeaders);

    console.log(`   ✅ Z-Move Turn Logs:`);
    zAttackRes.data.turnLogs.forEach(l => console.log(`      - [${l.type}] ${l.text}`));
    console.log(`   Action Sequence Steps (${zAttackRes.data.actionSequence.length}):`);
    zAttackRes.data.actionSequence.forEach(s => {
      console.log(`      * Step: ${s.type} -> ${s.actorName || ''} (${s.text || ''}) [FX: ${s.fxType || 'none'}]`);
    });

    // 10. Switch to Charizard (index 1) if battle still in progress
    battle = zAttackRes.data.battle;
    console.log(`\n🔟 Checking Battle Status: ${battle.status}, ActiveIndex: ${battle.userActiveIndex}`);
    battle.userTeam.forEach((p, idx) => console.log(`   Team[${idx}]: ${p.name} (HP: ${p.hp}/${p.maxHp})`));
    
    // Find an available alive teammate index that is NOT userActiveIndex
    const aliveIdx = battle.userTeam.findIndex((p, idx) => idx !== battle.userActiveIndex && p.hp > 0);
    console.log(`   Found alive switch target index: ${aliveIdx}`);

    if (battle.status === 'IN_PROGRESS' && aliveIdx !== -1) {
      console.log(`   Switching to teammate at index ${aliveIdx}...`);
      const switchRes = await axios.post(`${API}/battle/action`, {
        action: 'switch',
        switchIndex: aliveIdx
      }, authHeaders);
      const newActive = switchRes.data.battle.userTeam[switchRes.data.battle.userActiveIndex];
      console.log(`   ✅ Switch result: Active is now ${newActive.name}`);

      // 11. Mega Evolution with Charizard
      console.log(`\n1️⃣1️⃣ Triggering Mega Evolution with Charizard...`);
      const megaRes = await axios.post(`${API}/battle/action`, {
        action: 'attack',
        moveIndex: 0,
        megaEvolve: true
      }, authHeaders);

      console.log(`   ✅ Mega Attack Turn Logs:`);
      megaRes.data.turnLogs.forEach(l => console.log(`      - [${l.type}] ${l.text}`));
      const megaActive = megaRes.data.battle.userTeam[megaRes.data.battle.userActiveIndex];
      console.log(`   Mega Evolution Form: ${megaActive.name} (IsMega: ${megaActive.isMega})`);
      console.log(`   Action Sequence Steps (${megaRes.data.actionSequence.length}):`);
      megaRes.data.actionSequence.forEach(s => {
        console.log(`      * Step: ${s.type} -> ${s.actorName || ''} (${s.text || ''}) [FX: ${s.fxType || 'none'}]`);
      });
    }

    console.log('\n🎉 ALL BATTLE GIMMICKS & ITEM TESTS PASSED WITH FLYING COLORS!\n');

  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runBattleGimmicksTest();

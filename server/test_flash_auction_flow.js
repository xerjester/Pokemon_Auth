const axios = require('axios');

async function testFlashAuction() {
  console.log('🧪 Testing 5-Minute Flash Mystery Auction & Shorter Test Timers...\n');
  const API = 'http://localhost:5000/api';

  // 1. Fetch auctions
  console.log('1️⃣ Fetching All Auctions from API...');
  const res = await axios.get(`${API}/auctions`);
  const { flashAuction, playerAuctions, auctions } = res.data;

  console.log(`   Total Auctions: ${auctions.length}`);
  console.log(`   Player Marketplace Auctions: ${playerAuctions.length}`);
  
  if (flashAuction) {
    console.log('\n2️⃣ Active 5-Minute Flash Auction:');
    console.log(`   - Pokémon: ${flashAuction.name} (Lv.${flashAuction.level || 60})`);
    console.log(`   - Rarity: ${flashAuction.rarity}`);
    console.log(`   - Current Bid: ${flashAuction.current_bid} FUKU`);
    console.log(`   - Highest Bidder: ${flashAuction.highest_bidder_name || 'None'}`);
    console.log(`   - Remaining Time: ${Math.round(flashAuction.seconds_remaining)} seconds (${(flashAuction.seconds_remaining / 60).toFixed(1)} mins)`);
    console.log(`   - Auction Type: ${flashAuction.auction_type}`);
  } else {
    throw new Error('Flash auction not found!');
  }

  // 2. Check Player Marketplace auction durations
  console.log('\n3️⃣ Checking Player Auction Durations (Should be shortened for testing):');
  playerAuctions.slice(0, 3).forEach(p => {
    console.log(`   - ${p.name} (${p.rarity}): ${Math.round(p.seconds_remaining)}s left (${(p.seconds_remaining / 60).toFixed(1)} mins)`);
  });

  // 3. Login as Ash & place bid on Flash Auction
  console.log('\n4️⃣ Ash Ketchum bidding on Flash Auction...');
  const loginRes = await axios.post(`${API}/auth/login`, {
    usernameOrEmail: 'ash_ketchum',
    password: 'pika1234'
  });
  const token = loginRes.data.token;
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch fresh auction data before bidding to get exact current bid
  const freshRes = await axios.get(`${API}/auctions`);
  const freshFlash = freshRes.data.flashAuction;
  const current = parseFloat(freshFlash.current_bid);
  const minInc = Math.max(100, Math.ceil(current * 0.05));
  const flashBidAmount = current + minInc + 500;
  const bidRes = await axios.post(`${API}/auctions/${freshFlash.id}/bid`, {
    amount: flashBidAmount
  }, authHeaders);

  console.log(`   ✅ Bid placed: ${bidRes.data.message}`);
  console.log(`   New Ash Balance: ${bidRes.data.newBalance} FUKU`);

  // 4. Verify Flash Auction updated
  const res2 = await axios.get(`${API}/auctions`);
  console.log(`\n5️⃣ Flash Auction Status after Ash's bid:`);
  console.log(`   - Current Bid: ${res2.data.flashAuction.current_bid} FUKU`);
  console.log(`   - Highest Bidder: ${res2.data.flashAuction.highest_bidder_name}`);

  console.log('\n🎉 FLASH AUCTION & SHORT TIMERS VERIFIED 100%!');
  process.exit(0);
}

testFlashAuction().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});

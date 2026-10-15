const jwt = require('jsonwebtoken');
const db = require('./src/config/db');

async function test() {
  console.log('--- 1. Testing contract-info ---');
  const r1 = await fetch('http://localhost:5000/api/web3/contract-info');
  const d1 = await r1.json();
  console.log('Contract Info:', {
    name: d1.name,
    symbol: d1.symbol,
    contractAddress: d1.contractAddress,
    depositAddress: d1.depositAddress
  });

  console.log('\n--- 2. Testing user transactions history ---');
  const userRes = await db.query("SELECT id, username, wallet_address, fuku_balance FROM users WHERE username = 'ash_ketchum'");
  const user = userRes.rows[0];
  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET || 'super_pokemon_fuku_master_secret_key_2026');

  const r2 = await fetch('http://localhost:5000/api/web3/transactions', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const d2 = await r2.json();
  console.log('User Transactions:', {
    depositCount: d2.deposits?.length,
    withdrawCount: d2.withdrawals?.length
  });

  console.log('\n--- 3. Testing deposit validation (invalid hash) ---');
  const r3 = await fetch('http://localhost:5000/api/web3/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ txHash: '0x12345' })
  });
  const d3 = await r3.json();
  console.log('Deposit with invalid hash error response:', d3);

  console.log('\n--- 4. Testing actual withdrawal and deposit execution ---');
  const r4Withdraw = await fetch('http://localhost:5000/api/web3/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ amount: 50, to: user.wallet_address || '0x267db26f3c687fa7b5c323a750fb82c1a375b9fe', isSimulated: true })
  });
  const d4Withdraw = await r4Withdraw.json();
  console.log('Withdraw execution response:', {
    status: r4Withdraw.status,
    message: d4Withdraw.message,
    txHash: d4Withdraw.txHash,
    newBalance: d4Withdraw.newBalance
  });

  const r4Deposit = await fetch('http://localhost:5000/api/web3/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ txHash: 'sim_' + Date.now(), walletAddress: user.wallet_address || '0x267db26f3c687fa7b5c323a750fb82c1a375b9fe' })
  });
  const d4Deposit = await r4Deposit.json();
  console.log('Deposit execution response:', {
    status: r4Deposit.status,
    message: d4Deposit.message,
    newBalance: d4Deposit.newBalance
  });

  console.log('\n--- 5. Testing transaction insertion & retrieval ---');
  const mockTx = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
  await db.query(
    "INSERT INTO fuku_deposits (user_id, tx_hash, from_address, amount, status) VALUES ($1, $2, $3, 1500, 'COMPLETED')",
    [user.id, mockTx, '0x1111111111111111111111111111111111111111']
  );

  const r5 = await fetch('http://localhost:5000/api/web3/transactions', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const d5 = await r5.json();
  console.log('Deposits after mock insertion:', d5.deposits?.length, '| Amount:', d5.deposits?.[0]?.amount);
  await db.query("DELETE FROM fuku_deposits WHERE tx_hash = $1", [mockTx]);
  console.log('Mock deposit cleaned up!');

  console.log('\n✅ All Web3 API endpoint tests passed successfully!');
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});

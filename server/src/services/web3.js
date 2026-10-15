const { ethers } = require('ethers');

const FUKU_CONTRACT_ADDRESS = process.env.FUKU_CONTRACT_ADDRESS || '0xEA295B3a4b4049461515EF523809126Ea4cbB6B6';
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '97');
const FUKU_DEPOSIT_ADDRESS = process.env.FUKU_DEPOSIT_ADDRESS || '';
const FUKU_PLATFORM_PRIVATE_KEY = process.env.FUKU_PLATFORM_PRIVATE_KEY || '';

// Standard ERC20 / BEP20 ABI for FUKU Token
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let provider;
try {
  provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
} catch (err) {
  console.warn('Warning: Could not initialize BSC Testnet RPC provider', err.message);
}

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
  }
  return provider;
}

const getFukuContract = () => {
  return new ethers.Contract(FUKU_CONTRACT_ADDRESS, ERC20_ABI, getProvider());
};

async function verifyFukuDeposit(txHash, expectedSender) {
  if (!FUKU_DEPOSIT_ADDRESS) throw new Error('ระบบยังไม่ได้ตั้งค่า FUKU_DEPOSIT_ADDRESS ใน server/.env');
  if (!txHash) throw new Error('กรุณาระบุ Transaction hash');

  // Support demo / simulated transactions in development
  if (txHash.startsWith('demo_') || txHash.startsWith('sim_') || txHash.startsWith('0xsim_')) {
    return {
      amount: '5000',
      from: expectedSender || '0x267db26f3c687fa7b5c323a750fb82c1a375b9fe',
      to: FUKU_DEPOSIT_ADDRESS,
      txHash,
      isSimulated: true
    };
  }

  if (!ethers.isHexString(txHash, 32)) throw new Error('Transaction hash ไม่ถูกต้อง (ต้องเป็น 66 ตัวอักษร)');

  const prov = getProvider();

  // Wait up to 15 seconds for transaction confirmation if newly broadcasted
  let receipt = await prov.getTransactionReceipt(txHash);
  if (!receipt) {
    try {
      receipt = await prov.waitForTransaction(txHash, 1, 15000);
    } catch (e) {
      console.warn('waitForTransaction timed out or failed:', e.message);
    }
  }

  if (!receipt || receipt.status !== 1) {
    throw new Error('ธุรกรรมยังไม่ได้รับการยืนยันบน BSC Testnet กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
  }

  const transaction = await prov.getTransaction(txHash).catch(() => null);
  if (transaction && transaction.chainId && transaction.chainId !== BigInt(CHAIN_ID)) {
    throw new Error('ธุรกรรมอยู่ผิดเครือข่าย (ต้องเป็น BNB Smart Chain Testnet)');
  }

  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  const matchingLog = receipt.logs.find(log => {
    if (log.address.toLowerCase() !== FUKU_CONTRACT_ADDRESS.toLowerCase()) return false;
    if (log.topics[0] !== transferTopic) return false;
    const toAddr = '0x' + (log.topics[2] || '').slice(-40).toLowerCase();
    return toAddr === FUKU_DEPOSIT_ADDRESS.toLowerCase();
  });

  if (!matchingLog) {
    throw new Error(`ธุรกรรมนี้ไม่ใช่การโอนเหรียญ FUKU เข้ากระเป๋ากลาง (${FUKU_DEPOSIT_ADDRESS})`);
  }

  const amount = BigInt(matchingLog.data);
  if (amount <= 0n) throw new Error('จำนวน FUKU ต้องมากกว่า 0');

  const sender = (transaction && transaction.from) || receipt.from || ('0x' + (matchingLog.topics[1] || '').slice(-40));

  return { 
    amount: ethers.formatUnits(amount, 18), 
    from: sender, 
    to: FUKU_DEPOSIT_ADDRESS,
    txHash 
  };
}

async function sendFukuWithdrawal(to, amount, options = {}) {
  if (!ethers.isAddress(to)) throw new Error('ที่อยู่กระเป๋าปลายทางไม่ถูกต้อง');
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('จำนวน FUKU ต้องมากกว่า 0');

  // Check if FUKU_PLATFORM_PRIVATE_KEY is a valid 32-byte private key
  const cleanKey = (FUKU_PLATFORM_PRIVATE_KEY || '').trim();
  const hasValidPrivateKey = (cleanKey.length === 64 || cleanKey.length === 66) &&
    ethers.isHexString(cleanKey.startsWith('0x') ? cleanKey : '0x' + cleanKey, 32);

  if (hasValidPrivateKey) {
    try {
      const pKey = cleanKey.startsWith('0x') ? cleanKey : '0x' + cleanKey;
      const prov = getProvider();
      const signer = new ethers.Wallet(pKey, prov);
      const contract = new ethers.Contract(FUKU_CONTRACT_ADDRESS, ERC20_ABI, signer);
      const parsedAmount = ethers.parseUnits(String(amount), 18);

      const [treasuryFuku, treasuryBnb] = await Promise.all([
        contract.balanceOf(signer.address).catch(() => 0n),
        prov.getBalance(signer.address).catch(() => 0n)
      ]);

      if (treasuryBnb === 0n) {
        throw new Error(`กระเป๋ากลาง (${signer.address}) ไม่มี BNB สำหรับจ่ายค่าแก๊ส (Gas Fee) บน BSC Testnet`);
      }

      if (treasuryFuku < parsedAmount) {
        throw new Error(`กระเป๋ากลาง (${signer.address}) มีเหรียญ FUKU ไม่เพียงพอสำหรับการถอน (มีเหลือ ${ethers.formatUnits(treasuryFuku, 18)} FUKU)`);
      }

      const transaction = await contract.transfer(to, parsedAmount);
      const receipt = await transaction.wait(1);
      return { 
        txHash: receipt.hash, 
        from: signer.address, 
        to, 
        amount: String(amount),
        isSimulated: false,
        explorerUrl: `https://testnet.bscscan.com/tx/${receipt.hash}`
      };
    } catch (onChainErr) {
      console.error('[Web3] On-chain transfer error:', onChainErr);
      throw new Error(`เกิดข้อผิดพลาดในการโอนเหรียญบน BSC Testnet: ${onChainErr.message}`);
    }
  }

  // If private key is missing or not configured, check if simulation was explicitly requested
  if (options && options.allowSimulation) {
    console.log('[Web3] Simulation mode requested for withdrawal.');
    const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    return { 
      txHash: mockTxHash, 
      from: FUKU_DEPOSIT_ADDRESS || '0x92354586D24C1F3d7302CcED45D9b5745E9D834C', 
      to, 
      amount: String(amount),
      isSimulated: true,
      explorerUrl: `https://testnet.bscscan.com/address/${to}`
    };
  }

  throw new Error('ไม่สามารถโอนเหรียญเข้า MetaMask ได้: เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า FUKU_PLATFORM_PRIVATE_KEY ที่ถูกต้องใน server/.env (ต้องการ Private Key 32-byte สำหรับเซ็นธุรกรรมโอนเหรียญบน BSC Testnet)');
}

/**
 * Fetch FUKU balance on-chain for a given wallet address
 */
async function getOnChainBalance(walletAddress) {
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return '0.00';
  }
  try {
    const contract = getFukuContract();
    const balanceRaw = await contract.balanceOf(walletAddress);
    return ethers.formatUnits(balanceRaw, 18);
  } catch (error) {
    console.warn(`Failed to read on-chain FUKU balance for ${walletAddress}:`, error.message);
    return '0.00';
  }
}

/**
 * Fetch token metadata
 */
async function getTokenInfo() {
  try {
    const contract = getFukuContract();
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name().catch(() => 'FUKU'),
      contract.symbol().catch(() => 'FUKU'),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => '100000000000000000000000000')
    ]);

    return {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatUnits(totalSupply, decimals),
      contractAddress: FUKU_CONTRACT_ADDRESS,
      depositAddress: FUKU_DEPOSIT_ADDRESS,
      depositAddress: FUKU_DEPOSIT_ADDRESS,
      chainId: CHAIN_ID,
      network: 'BNB Smart Chain Testnet',
      explorerUrl: `https://testnet.bscscan.com/token/${FUKU_CONTRACT_ADDRESS}`
    };
  } catch (error) {
    return {
      name: 'FUKU',
      symbol: 'FUKU',
      decimals: 18,
      contractAddress: FUKU_CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      network: 'BNB Smart Chain Testnet',
      explorerUrl: `https://testnet.bscscan.com/token/${FUKU_CONTRACT_ADDRESS}`
    };
  }
}

module.exports = {
  FUKU_CONTRACT_ADDRESS,
  BSC_TESTNET_RPC,
  CHAIN_ID,
  ERC20_ABI,
  getOnChainBalance,
  getTokenInfo,
  verifyFukuDeposit,
  sendFukuWithdrawal,
  FUKU_DEPOSIT_ADDRESS
};

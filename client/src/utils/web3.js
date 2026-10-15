import { ethers } from 'ethers';

export const FUKU_CONTRACT_ADDRESS = '0xEA295B3a4b4049461515EF523809126Ea4cbB6B6';
export const BSC_TESTNET_CHAIN_ID = '0x61'; // 97 in hex
export const BSC_TESTNET_CONFIG = {
  chainId: '0x61',
  chainName: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

export const ERC20_MINIMAL_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

/**
 * Check if MetaMask or compatible web3 provider is installed
 */
export function hasWeb3Provider() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Check if MetaMask is already unlocked and connected to this site without prompting
 */
export async function getConnectedWallet() {
  if (!hasWeb3Provider()) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
  } catch (err) {
    console.warn('Error checking connected MetaMask accounts:', err.message);
  }
  return null;
}

/**
 * Connect wallet & ensure network is BSC Testnet
 */
export async function connectWallet() {
  if (!hasWeb3Provider()) {
    throw new Error('กรุณาติดตั้ง MetaMask หรือ Web3 Wallet ในบราวเซอร์ของคุณ');
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  const selectedAddress = accounts[0];

  // Try switching to BSC Testnet
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC_TESTNET_CHAIN_ID }],
    });
  } catch (switchError) {
    // Error code 4902 indicates chain has not been added to MetaMask
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [BSC_TESTNET_CONFIG],
      });
    } else {
      console.warn('Network switch issue:', switchError.message);
    }
  }

  return selectedAddress;
}

/**
 * Get FUKU balance from on-chain smart contract (BNB Smart Chain Testnet)
 */
export async function fetchOnChainFukuBalance(walletAddress) {
  if (!walletAddress) return '0.00';

  try {
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_CONFIG.rpcUrls[0]);
    const contract = new ethers.Contract(FUKU_CONTRACT_ADDRESS, ERC20_MINIMAL_ABI, provider);
    const rawBalance = await contract.balanceOf(walletAddress);
    return ethers.formatUnits(rawBalance, 18);
  } catch (err) {
    console.warn('Direct BSC RPC query failed, falling back to server API balance:', err.message);
    try {
      const res = await fetch(`/api/web3/balance/${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        return data.balance || '0.00';
      }
    } catch (e) {
      console.warn('Server balance API fallback also failed:', e.message);
    }
    return '0.00';
  }
}

/**
 * Prompt MetaMask to add FUKU token to asset list
 */
export async function addFukuTokenToMetaMask() {
  if (!hasWeb3Provider()) return false;

  try {
    return await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: FUKU_CONTRACT_ADDRESS,
          symbol: 'FUKU',
          decimals: 18,
          image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
        },
      },
    });
  } catch (err) {
    console.error('Error adding FUKU to MetaMask:', err);
    return false;
  }
}

export async function transferFuku(to, amount) {
  if (!hasWeb3Provider()) {
    throw new Error('กรุณาติดตั้ง MetaMask หรือ Web3 Wallet ก่อนโอน FUKU');
  }

  if (!ethers.isAddress(to)) {
    throw new Error('ที่อยู่กระเป๋าปลายทางไม่ถูกต้อง');
  }

  // Ensure network is BSC Testnet
  let provider = new ethers.BrowserProvider(window.ethereum);
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 97n) {
      await connectWallet();
      provider = new ethers.BrowserProvider(window.ethereum);
    }
  } catch (e) {
    await connectWallet();
    provider = new ethers.BrowserProvider(window.ethereum);
  }

  const signer = await provider.getSigner();
  const contract = new ethers.Contract(FUKU_CONTRACT_ADDRESS, ERC20_MINIMAL_ABI, signer);
  const parsedAmount = ethers.parseUnits(String(amount), 18);
  const transaction = await contract.transfer(to, parsedAmount);
  await transaction.wait(1);
  return transaction.hash;
}

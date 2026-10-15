import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuctionPage from './pages/AuctionPage';
import PokedexPage from './pages/PokedexPage';
import InventoryPage from './pages/InventoryPage';
import TeamPage from './pages/TeamPage';
import BattlePage from './pages/BattlePage';
import PvpPage from './pages/PvpPage';
import ShopPage from './pages/ShopPage';
import FarmPage from './pages/FarmPage';
import WalletPage from './pages/WalletPage';
import LoginPage from './pages/LoginPage';
import ActivityTicker from './components/ActivityTicker';
import IncomingPvPModal from './components/IncomingPvPModal';
import { fetchOnChainFukuBalance, connectWallet, getConnectedWallet } from './utils/web3';

export default function App() {
  const [activeTab, setActiveTab] = useState('auctions');
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [onChainFuku, setOnChainFuku] = useState('0.00');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Global Real-Player PvP Challenge States
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [acceptingChallenge, setAcceptingChallenge] = useState(false);
  const [incomingRoomId, setIncomingRoomId] = useState(null);

  useEffect(() => {
    checkAuth();

    // Check if MetaMask is ACTUALLY connected and unlocked
    const checkMetaMaskConnection = async () => {
      const activeAccount = await getConnectedWallet();
      if (activeAccount) {
        setWalletAddress(activeAccount);
        updateOnChainBalance(activeAccount);
      } else {
        setWalletAddress('');
        setOnChainFuku('0.00');
      }
    };
    checkMetaMaskConnection();

    // Listen to MetaMask account / lock / unlock events
    if (window.ethereum && window.ethereum.on) {
      const handleAccountsChanged = (accounts) => {
        if (accounts && accounts.length > 0) {
          handleWalletChange(accounts[0]);
        } else {
          setWalletAddress('');
          setOnChainFuku('0.00');
        }
      };

      const handleChainChanged = () => {
        checkMetaMaskConnection();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('pokemon_token');
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Only set walletAddress if MetaMask is actively unlocked/connected in this browser
        const activeAccount = await getConnectedWallet();
        if (activeAccount) {
          setWalletAddress(activeAccount);
          updateOnChainBalance(activeAccount);
        } else {
          setWalletAddress('');
          setOnChainFuku('0.00');
        }
      } else {
        localStorage.removeItem('pokemon_token');
      }
    } catch (err) {
      console.error('Auth verification error:', err);
    }
  };

  const updateOnChainBalance = async (addr) => {
    if (!addr) return;
    try {
      const bal = await fetchOnChainFukuBalance(addr);
      setOnChainFuku(bal);
    } catch (e) {
      console.warn('Failed to fetch on-chain balance:', e);
    }
  };

  const handleWalletChange = (newAddress) => {
    setWalletAddress(newAddress);
    updateOnChainBalance(newAddress);
    setUser(prev => prev ? { ...prev, wallet_address: newAddress } : prev);
    // Link wallet with current user profile if logged in
    const token = localStorage.getItem('pokemon_token');
    if (token && newAddress) {
      fetch('/api/auth/link-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress: newAddress })
      })
      .then(res => res.json())
      .then(data => {
        if (data.wallet_address) {
          setUser(prev => prev ? { ...prev, wallet_address: data.wallet_address } : prev);
        }
      })
      .catch(console.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pokemon_token');
    setUser(null);
    setWalletAddress('');
    setOnChainFuku('0.00');
    setIncomingChallenge(null);
    alert('ออกจากระบบเรียบร้อยแล้ว');
  };

  // Poll for incoming PvP challenges across ALL pages
  useEffect(() => {
    if (!user) {
      setIncomingChallenge(null);
      return;
    }

    const pollIncomingChallenges = async () => {
      try {
        const token = localStorage.getItem('pokemon_token');
        if (!token) return;
        const res = await fetch('/api/pvp/challenges/incoming', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.challenges && data.challenges.length > 0) {
          setIncomingChallenge(data.challenges[0]);
        } else {
          setIncomingChallenge(null);
        }
      } catch (err) {
        // silent fail on network glitch
      }
    };

    pollIncomingChallenges();
    const interval = setInterval(pollIncomingChallenges, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle Accept incoming PvP challenge
  const handleAcceptPvPChallenge = async (challengeId) => {
    setAcceptingChallenge(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch(`/api/pvp/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถตอบรับคำท้าได้');

      setIncomingChallenge(null);
      setIncomingRoomId(data.roomId);
      setActiveTab('pvp');
      checkAuth();
    } catch (err) {
      alert(err.message);
    } finally {
      setAcceptingChallenge(false);
    }
  };

  // Handle Decline incoming PvP challenge
  const handleDeclinePvPChallenge = async (challengeId) => {
    try {
      const token = localStorage.getItem('pokemon_token');
      await fetch(`/api/pvp/challenges/${challengeId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIncomingChallenge(null);
    } catch (err) {
      console.error('Decline challenge error:', err);
      setIncomingChallenge(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        walletAddress={walletAddress}
        setWalletAddress={handleWalletChange}
        onChainFuku={onChainFuku}
      />

      <ActivityTicker />

      <main style={{ flex: 1 }}>
        {activeTab === 'auctions' && (
          <AuctionPage
            user={user}
            onRefreshUser={checkAuth}
          />
        )}

        {activeTab === 'pokedex' && (
          <PokedexPage
            onNavigateToAuction={(pokemonName) => {
              setActiveTab('auctions');
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            user={user}
            onRefreshUser={checkAuth}
            onNavigateToShop={() => setActiveTab('shop')}
          />
        )}

        {activeTab === 'team' && (
          <TeamPage
            user={user}
            onNavigateToBattle={() => setActiveTab('battle')}
            onNavigateToInventory={() => setActiveTab('inventory')}
          />
        )}

        {activeTab === 'battle' && (
          <BattlePage
            user={user}
            onRefreshUser={checkAuth}
            onNavigateToTeam={() => setActiveTab('team')}
            onNavigateToFarm={() => setActiveTab('farm')}
          />
        )}

        {activeTab === 'pvp' && (
          <PvpPage
            user={user}
            onRefreshUser={checkAuth}
            onNavigateToTeam={() => setActiveTab('team')}
            incomingRoomId={incomingRoomId}
            onClearIncomingRoom={() => setIncomingRoomId(null)}
          />
        )}

        {activeTab === 'shop' && (
          <ShopPage
            user={user}
            onRefreshUser={checkAuth}
          />
        )}

        {activeTab === 'farm' && (
          <FarmPage
            user={user}
            onRefreshUser={checkAuth}
            onNavigateToBattle={() => setActiveTab('battle')}
            onNavigateToTeam={() => setActiveTab('team')}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletPage
            user={user}
            onRefreshUser={checkAuth}
            walletAddress={walletAddress}
            setWalletAddress={handleWalletChange}
            onChainFuku={onChainFuku}
            onRefreshBalance={() => walletAddress && updateOnChainBalance(walletAddress)}
            onNavigateToFarm={() => setActiveTab('farm')}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(9, 12, 21, 0.95)',
        borderTop: '1px solid var(--border-glass)',
        padding: '24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        marginTop: 60
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <b>PokéAuction & Arena</b> — Powered by PokéAPI & FUKU Smart Contract (BSC Testnet)
          </div>
          <div>
            Smart Contract: <code>0xEA295B3a4b4049461515EF523809126Ea4cbB6B6</code>
          </div>
        </div>
      </footer>

      {/* Global Incoming PvP Challenge Modal (Pops up on ANY page) */}
      <IncomingPvPModal
        challenge={incomingChallenge}
        onAccept={handleAcceptPvPChallenge}
        onDecline={handleDeclinePvPChallenge}
        loading={acceptingChallenge}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            getConnectedWallet().then((activeAccount) => {
              if (activeAccount) {
                setWalletAddress(activeAccount);
                updateOnChainBalance(activeAccount);
              } else {
                setWalletAddress('');
                setOnChainFuku('0.00');
              }
            });
          }}
        />
      )}
    </div>
  );
}

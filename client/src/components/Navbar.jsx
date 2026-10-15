import React from 'react';
import { Coins, Wallet, Shield, Swords, Package, Flame, LogIn, LogOut, Trophy, ShoppingBag, BookOpen, Sparkles } from 'lucide-react';
import { connectWallet, addFukuTokenToMetaMask } from '../utils/web3';

export default function Navbar({ 
  user, 
  onLogout, 
  onOpenLogin, 
  activeTab, 
  setActiveTab, 
  walletAddress, 
  setWalletAddress,
  onChainFuku
}) {
  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
    } catch (err) {
      alert(err.message);
    }
  };

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(9, 12, 21, 0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-glass)',
      padding: '0 16px',
      overflowX: 'hidden'
    }}>
      <div style={{
        maxWidth: 1440,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        gap: 12
      }}>
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('auctions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff4757 0%, #ffa502 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(255, 71, 87, 0.4)'
          }}>
            <img 
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" 
              alt="Pokeball" 
              style={{ width: 24, height: 24 }}
            />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.1 }}>
              <span>POKÉ<span style={{ color: 'var(--accent-cyan)' }}>ARENA</span></span>
              <span style={{ 
                fontSize: '0.62rem', 
                background: 'rgba(243, 156, 18, 0.2)', 
                color: '#f39c12',
                border: '1px solid rgba(243, 156, 18, 0.5)',
                padding: '1px 5px',
                borderRadius: 4,
                fontWeight: 800
              }}>FUKU</span>
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: 0.5 }}>BSC TESTNET</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ 
          display: 'flex', 
          gap: 4, 
          flexShrink: 1, 
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '4px 0'
        }}>
          {[
            { id: 'auctions', label: 'ประมูล', icon: <Flame size={15} /> },
            { id: 'pokedex', label: 'สารานุกรม', icon: <BookOpen size={15} /> },
            { id: 'inventory', label: 'คลัง', icon: <Package size={15} /> },
            { id: 'shop', label: 'ร้านค้า', icon: <ShoppingBag size={15} /> },
            { id: 'farm', label: 'ฟาร์มเงิน', icon: <Sparkles size={15} /> },
            { id: 'team', label: 'จัดทีม', icon: <Shield size={15} /> },
            { id: 'battle', label: 'ยิม', icon: <Swords size={15} /> },
            { id: 'pvp', label: 'PvP', icon: <Trophy size={15} /> },
            { id: 'wallet', label: 'กระเป๋า', icon: <Coins size={15} /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                  color: isActive ? '#00d2ff' : 'var(--text-muted)',
                  border: isActive ? '1px solid rgba(0, 210, 255, 0.35)' : '1px solid transparent',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Balance & Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {user ? (
            <>
              {/* In-Game FUKU Balance */}
              <div 
                onClick={() => setActiveTab('wallet')}
                title="คลิกเพื่อเปิดหน้ากระเป๋าเงิน (FUKU Wallet)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(243, 156, 18, 0.12)',
                  border: '1px solid rgba(243, 156, 18, 0.35)',
                  padding: '5px 10px',
                  borderRadius: 9999,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#f39c12',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Coins size={14} />
                <span>{Number(user.fuku_balance || 0).toLocaleString()} FUKU</span>
              </div>

              {/* Web3 MetaMask Button */}
              {walletAddress ? (
                <div 
                  onClick={addFukuTokenToMetaMask}
                  title="คลิกเพื่อเพิ่มเหรียญ FUKU เข้า MetaMask"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(37, 124, 255, 0.12)',
                    border: '1px solid rgba(37, 124, 255, 0.3)',
                    padding: '5px 10px',
                    borderRadius: 9999,
                    fontSize: '0.78rem',
                    color: '#74b9ff',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Wallet size={13} />
                  <span>{shortenAddress(walletAddress)}</span>
                </div>
              ) : (
                <button 
                  onClick={handleConnectWallet}
                  className="btn btn-outline"
                  style={{ padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  <Wallet size={13} />
                  <span>ต่อ MetaMask</span>
                </button>
              )}

              {/* User Avatar & Logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                  {user.username}
                </span>
                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-dim)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={onOpenLogin}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              <LogIn size={14} />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Flame, Search, Filter, Plus, RefreshCw, Sparkles, ShieldCheck, Zap, Users } from 'lucide-react';
import AuctionCard from '../components/AuctionCard';
import FlashAuctionCard from '../components/FlashAuctionCard';
import BidModal from '../components/BidModal';
import CreateAuctionModal from '../components/CreateAuctionModal';

const TYPE_FILTERS = ['ทั้งหมด', 'fire', 'water', 'grass', 'electric', 'psychic', 'dragon', 'ice', 'ghost'];

export default function AuctionPage({ user, onRefreshUser }) {
  const [auctions, setAuctions] = useState([]);
  const [playerAuctions, setPlayerAuctions] = useState([]);
  const [flashAuction, setFlashAuction] = useState(null);
  const [flashPokemonAuction, setFlashPokemonAuction] = useState(null);
  const [flashItemAuction, setFlashItemAuction] = useState(null);
  const [flashSubTab, setFlashSubTab] = useState('all_flash'); // 'all_flash', 'pokemon', 'item'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedRarity, setSelectedRarity] = useState('ทั้งหมด');
  const [auctionViewMode, setAuctionViewMode] = useState('all'); // 'all', 'flash', 'player'
  
  const [activeBidAuction, setActiveBidAuction] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userPokemons, setUserPokemons] = useState([]);

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(() => {
      fetchAuctions(false);
    }, 6000); // Polling every 6s for live bot bids & timer updates

    if (user) {
      fetchUserPokemons();
    }
    return () => clearInterval(interval);
  }, [user, search, selectedType, selectedRarity]);

  const fetchAuctions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let url = '/api/auctions?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedType !== 'ทั้งหมด') url += `type=${selectedType}&`;
      if (selectedRarity !== 'ทั้งหมด') url += `rarity=${selectedRarity}&`;

      const res = await fetch(url);
      const data = await res.json();
      setAuctions(data.auctions || []);
      setFlashAuction(data.flashAuction || null);
      setFlashPokemonAuction(data.flashPokemonAuction || null);
      setFlashItemAuction(data.flashItemAuction || null);
      setPlayerAuctions(data.playerAuctions || (data.auctions || []).filter(a => !['FLASH_SYSTEM', 'FLASH_POKEMON', 'FLASH_ITEM'].includes(a.auction_type)));
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUserPokemons = async () => {
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUserPokemons(data.pokemons || []);
    } catch (err) {
      console.error('Error fetching inventory for auction create:', err);
    }
  };

  const displayedPlayerAuctions = (auctionViewMode === 'flash') 
    ? [] 
    : playerAuctions;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 26, 43, 0.9) 0%, rgba(13, 20, 36, 0.9) 100%)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
        padding: '32px 36px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: 40,
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(243, 156, 18, 0.15)', border: '1px solid rgba(243, 156, 18, 0.4)', color: '#f39c12', padding: '4px 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
              <ShieldCheck size={14} />
              <span>SMART CONTRACT POWERED POKÉMON AUCTION</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>
              ตลาดประมูลโปเกมอน 2 รูปแบบ
            </h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: 680, fontSize: '0.95rem' }}>
              แย่งชิงโปเกมอนด้วยเหรียญ <b style={{ color: '#f39c12' }}>FUKU</b>: ทั้งแบบ <b>การประมูลสายฟ้า 5 นาที</b> (สุ่มตัวแรร์/ตำนาน แข่งกับเทรนเนอร์ทั่วโลก) และ <b>ตลาดประมูลเทรนเนอร์</b> ซื้อขายได้ตามใจชอบ!
            </p>
          </div>

          {user && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '1rem' }}
            >
              <Plus size={18} />
              <span>เปิดการประมูลจากคลัง</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Buttons */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 28,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setAuctionViewMode('all')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: auctionViewMode === 'all' ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
            background: auctionViewMode === 'all' ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: auctionViewMode === 'all' ? '#00d2ff' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Sparkles size={16} />
          <span>ทั้งหมด (Flash + ตลาดผู้เล่น)</span>
        </button>

        <button
          onClick={() => setAuctionViewMode('flash')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: auctionViewMode === 'flash' ? '1px solid #f39c12' : '1px solid var(--border-glass)',
            background: auctionViewMode === 'flash' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(255, 255, 255, 0.03)',
            color: auctionViewMode === 'flash' ? '#f39c12' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Zap size={16} />
          <span>การประมูลสายฟ้า 5 นาที</span>
        </button>

        <button
          onClick={() => setAuctionViewMode('player')}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: auctionViewMode === 'player' ? '1px solid #2ed573' : '1px solid var(--border-glass)',
            background: auctionViewMode === 'player' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: auctionViewMode === 'player' ? '#2ed573' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Users size={16} />
          <span>ตลาดประมูลผู้เล่น ({playerAuctions.length})</span>
        </button>
      </div>

      {/* 1. Featured Section: Dual 5-Minute Flash Auctions (Pokémon & Items) */}
      {(auctionViewMode === 'all' || auctionViewMode === 'flash') && (
        <div style={{ marginBottom: 40 }}>
          {/* Subtabs for Flash Auction */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={22} style={{ color: '#f39c12' }} />
              <span>การประมูลสายฟ้า 5 นาที (Flash Auctions)</span>
            </h2>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setFlashSubTab('all_flash')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: flashSubTab === 'all_flash' ? '1px solid #f39c12' : '1px solid var(--border-glass)',
                  background: flashSubTab === 'all_flash' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: flashSubTab === 'all_flash' ? '#f39c12' : 'var(--text-muted)'
                }}
              >
                แสดงทั้งสองห้อง
              </button>
              <button
                onClick={() => setFlashSubTab('pokemon')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: flashSubTab === 'pokemon' ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                  background: flashSubTab === 'pokemon' ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: flashSubTab === 'pokemon' ? '#00d2ff' : 'var(--text-muted)'
                }}
              >
                โปเกมอนสายฟ้า
              </button>
              <button
                onClick={() => setFlashSubTab('item')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: flashSubTab === 'item' ? '1px solid #a55eea' : '1px solid var(--border-glass)',
                  background: flashSubTab === 'item' ? 'rgba(165, 94, 234, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: flashSubTab === 'item' ? '#a55eea' : 'var(--text-muted)'
                }}
              >
                ไอเท็มสายฟ้า
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Flash Pokemon Auction */}
            {(flashSubTab === 'all_flash' || flashSubTab === 'pokemon') && (
              <FlashAuctionCard
                flashAuction={flashPokemonAuction || (!flashItemAuction ? flashAuction : null)}
                currentUserId={user?.id}
                customTitle="FLASH POKÉMON (โปเกมอนสายฟ้า 5 นาที)"
                onOpenBid={auction => {
                  if (!user) {
                    alert('กรุณาเข้าสู่ระบบก่อนทำการประมูล');
                    return;
                  }
                  setActiveBidAuction(auction);
                }}
              />
            )}

            {/* Flash Item Auction */}
            {(flashSubTab === 'all_flash' || flashSubTab === 'item') && (
              <FlashAuctionCard
                flashAuction={flashItemAuction}
                currentUserId={user?.id}
                customTitle="FLASH ITEM (ไอเท็มสายฟ้า 5 นาที)"
                onOpenBid={auction => {
                  if (!user) {
                    alert('กรุณาเข้าสู่ระบบก่อนทำการประมูล');
                    return;
                  }
                  setActiveBidAuction(auction);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* 2. Player Marketplace Section */}
      {(auctionViewMode === 'all' || auctionViewMode === 'player') && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 16
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={22} style={{ color: '#2ed573' }} />
              <span>ตลาดประมูลโปเกมอนของผู้เล่น (Player Market)</span>
            </h2>

            {/* Refresh button */}
            <button
              onClick={() => fetchAuctions(true)}
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={14} />
              <span>รีเฟรช</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 420 }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="ค้นหาโปเกมอนในตลาด..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: '10px 16px 10px 42px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Type pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map(type => {
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 9999,
                      background: isSelected ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#00d2ff' : 'var(--text-muted)',
                      border: isSelected ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Auctions Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
              <div>กำลังโหลดรายการประมูล...</div>
            </div>
          ) : displayedPlayerAuctions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border-glass)'
            }}>
              <Flame size={40} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>ไม่มีรายการในตลาดผู้เล่นขณะนี้</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                คุณสามารถนำโปเกมอนจากคลังมาเปิดประมูลด่วน 1-2 นาทีได้เลย!
              </p>
              {user && (
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                  <Plus size={16} />
                  <span>เปิดประมูลตัวแรกของคุณ</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 24
            }}>
              {displayedPlayerAuctions.map(auc => (
                <AuctionCard
                  key={auc.id}
                  auction={auc}
                  currentUserId={user?.id}
                  onOpenBid={auction => {
                    if (!user) {
                      alert('กรุณาเข้าสู่ระบบก่อนทำการประมูล');
                      return;
                    }
                    setActiveBidAuction(auction);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bid Modal */}
      {activeBidAuction && (
        <BidModal
          auction={activeBidAuction}
          userBalance={parseFloat(user?.fuku_balance || 0)}
          onClose={() => setActiveBidAuction(null)}
          onBidSuccess={() => {
            fetchAuctions(false);
            if (onRefreshUser) onRefreshUser();
          }}
        />
      )}

      {/* Create Auction Modal */}
      {showCreateModal && (
        <CreateAuctionModal
          userPokemons={userPokemons}
          onClose={() => setShowCreateModal(false)}
          onCreateSuccess={() => {
            fetchAuctions(false);
            fetchUserPokemons();
          }}
        />
      )}
    </div>
  );
}

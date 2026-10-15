import React, { useState, useEffect } from 'react';
import { Clock, Zap, Gavel, User, Sparkles } from 'lucide-react';
import { TYPE_COLORS, RARITY_STYLES } from '../utils/typeColors';

export default function AuctionCard({ auction, onOpenBid, currentUserId }) {
  const [timeLeft, setTimeLeft] = useState(auction.seconds_remaining || 0);

  useEffect(() => {
    setTimeLeft(auction.seconds_remaining || 0);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [auction.seconds_remaining]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'หมดเวลาแล้ว';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs} ชม. ${mins} น. ${secs} วิ`;
    }
    return `${mins} น. ${secs} วิ`;
  };

  const types = Array.isArray(auction.types) 
    ? auction.types 
    : JSON.parse(auction.types || '[]');

  const stats = typeof auction.base_stats === 'object' 
    ? auction.base_stats 
    : JSON.parse(auction.base_stats || '{}');

  const rarityStyle = RARITY_STYLES[auction.rarity] || RARITY_STYLES.Common;
  const isOwner = currentUserId === auction.seller_id;
  const isHighestBidder = currentUserId === auction.highest_bidder_id;

  return (
    <div 
      className="pokemon-card" 
      style={{
        border: `1px solid ${rarityStyle.border}`,
        boxShadow: rarityStyle.glow !== 'none' ? rarityStyle.glow : 'none'
      }}
    >
      {/* Top Bar: Rarity + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span 
          className="badge" 
          style={{ 
            color: rarityStyle.color, 
            background: rarityStyle.bg, 
            border: `1px solid ${rarityStyle.border}` 
          }}
        >
          <Sparkles size={11} />
          {auction.rarity}
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.78rem',
          color: timeLeft < 300 ? '#ff4757' : 'var(--text-muted)',
          fontWeight: 600,
          background: timeLeft < 300 ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          padding: '2px 8px',
          borderRadius: 6
        }}>
          <Clock size={13} />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Pokémon Artwork */}
      <div className="pokemon-card-art">
        <div style={{
          position: 'absolute',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: types[0] && TYPE_COLORS[types[0]] ? TYPE_COLORS[types[0]].bg : '#3498db',
          opacity: 0.15,
          filter: 'blur(30px)'
        }} />
        <img 
          src={auction.artwork_url || auction.sprite_url} 
          alt={auction.name} 
          loading="lazy"
        />
      </div>

      {/* Pokemon Name */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{auction.name}</h3>
        {auction.pokemon_id && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>#{auction.pokemon_id}</span>}
      </div>

      {/* Types */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {types.map(t => {
          const conf = TYPE_COLORS[t.toLowerCase()] || { bg: '#555', text: '#fff' };
          return (
            <span 
              key={t}
              className="badge"
              style={{ background: conf.bg, color: conf.text }}
            >
              {t}
            </span>
          );
        })}
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '8px 10px',
        borderRadius: 8,
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        marginBottom: 14
      }}>
        <div>HP: <b style={{ color: '#fff' }}>{stats.hp || '-'}</b></div>
        <div>ATK: <b style={{ color: '#fff' }}>{stats.attack || '-'}</b></div>
        <div>SPD: <b style={{ color: '#fff' }}>{stats.speed || '-'}</b></div>
      </div>

      {/* Pricing / Bidding Section */}
      <div style={{
        marginTop: 'auto',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-glass)',
        padding: 12,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ราคาประมูลปัจจุบัน</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f39c12' }}>
              {parseFloat(auction.current_bid).toLocaleString()} <span style={{ fontSize: '0.8rem' }}>FUKU</span>
            </div>
          </div>
          {auction.buyout_price && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ซื้อทันที (Buyout)</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {parseFloat(auction.buyout_price).toLocaleString()} FUKU
              </div>
            </div>
          )}
        </div>

        {/* Highest Bidder & Seller info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={12} />
            <span>ผู้ขาย: {auction.seller_name}</span>
          </div>
          {auction.highest_bidder_name && (
            <span style={{ color: isHighestBidder ? '#2ed573' : 'var(--text-muted)' }}>
              {isHighestBidder ? 'คุณนำอยู่' : `ผู้นำ: ${auction.highest_bidder_name}`}
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onOpenBid(auction)}
          disabled={timeLeft <= 0 || isOwner}
          className="btn btn-primary"
          style={{ width: '100%', padding: '10px 0', marginTop: 4 }}
        >
          <Gavel size={16} />
          <span>{isOwner ? 'โปเกมอนของคุณ' : timeLeft <= 0 ? 'หมดเวลาประมูล' : 'เสนอราคาประมูล'}</span>
        </button>
      </div>
    </div>
  );
}

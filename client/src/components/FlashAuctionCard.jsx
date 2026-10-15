import React, { useState, useEffect } from 'react';
import { Zap, Clock, Gavel, Sparkles, User, ShieldAlert, Bot } from 'lucide-react';
import { TYPE_COLORS, RARITY_STYLES } from '../utils/typeColors';

export default function FlashAuctionCard({ flashAuction, onOpenBid, currentUserId, customTitle }) {
  if (!flashAuction) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.7) 0%, rgba(15, 20, 35, 0.8) 100%)',
        border: '1px dashed rgba(0, 210, 255, 0.3)',
        borderRadius: 20,
        padding: '36px 24px',
        textAlign: 'center',
        color: 'var(--text-muted)'
      }}>
        <Zap size={36} style={{ color: '#f39c12', marginBottom: 12, animation: 'pulseGlow 1.5s infinite' }} />
        <h3>{customTitle ? `กำลังสุ่ม ${customTitle} รอบถัดไป...` : 'กำลังเตรียมเปิดการประมูลสายฟ้า 5 นาทีรอบถัดไป...'}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
          ระบบจะเปิดรอบใหม่โดยอัตโนมัติทุกๆ 5 นาที
        </p>
      </div>
    );
  }

  const [timeLeft, setTimeLeft] = useState(flashAuction.seconds_remaining || 0);

  useEffect(() => {
    setTimeLeft(flashAuction.seconds_remaining || 0);
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
  }, [flashAuction.seconds_remaining]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'กำลังปิดและสุ่มตัวถัดไป...';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const types = Array.isArray(flashAuction.types) 
    ? flashAuction.types 
    : JSON.parse(flashAuction.types || '[]');

  const stats = typeof flashAuction.base_stats === 'object' 
    ? flashAuction.base_stats 
    : JSON.parse(flashAuction.base_stats || '{}');

  const isItem = !!flashAuction.item_id || !flashAuction.user_pokemon_id;
  const rarityStyle = RARITY_STYLES[flashAuction.rarity] || RARITY_STYLES.Legendary;
  const isHighestBidder = currentUserId === flashAuction.highest_bidder_id;
  const isUrgent = timeLeft > 0 && timeLeft <= 60;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(35, 18, 55, 0.85) 0%, rgba(16, 24, 45, 0.95) 100%)',
      border: isUrgent ? '2px solid #ff4757' : isItem ? '2px solid #a55eea' : '2px solid rgba(243, 156, 18, 0.5)',
      borderRadius: 24,
      padding: '24px 30px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: isUrgent 
        ? '0 0 35px rgba(255, 71, 87, 0.35)' 
        : isItem
        ? '0 0 35px rgba(165, 94, 234, 0.3)'
        : '0 0 35px rgba(243, 156, 18, 0.25)',
      marginBottom: 36,
      transition: 'all 0.3s ease'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 250,
        height: 250,
        background: isItem 
          ? 'radial-gradient(circle, rgba(165, 94, 234, 0.25) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(243, 156, 18, 0.25) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: isItem 
              ? 'linear-gradient(135deg, #a55eea 0%, #4b7bec 100%)'
              : 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)',
            color: '#fff',
            padding: '4px 14px',
            borderRadius: 9999,
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: isItem ? '0 0 15px rgba(165, 94, 234, 0.4)' : '0 0 15px rgba(243, 156, 18, 0.4)'
          }}>
            <Zap size={14} />
            <span>{customTitle || (isItem ? 'FLASH ITEM (ไอเท็มสายฟ้า 5 นาที)' : 'FLASH POKÉMON (โปเกมอนสายฟ้า 5 นาที)')}</span>
          </span>

          <span className="badge" style={{ color: rarityStyle.color, background: rarityStyle.bg, border: `1px solid ${rarityStyle.border}` }}>
            <Sparkles size={12} />
            {flashAuction.rarity}
          </span>
        </div>

        {/* Dynamic 5-Min Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: isUrgent ? 'rgba(255, 71, 87, 0.25)' : 'rgba(0, 0, 0, 0.5)',
          border: isUrgent ? '1px solid #ff4757' : '1px solid var(--border-glass)',
          padding: '6px 18px',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: '1.2rem',
          color: isUrgent ? '#ff4757' : isItem ? '#a55eea' : '#f39c12',
          animation: isUrgent ? 'pulseGlow 1s infinite' : 'none'
        }}>
          <Clock size={20} />
          <span>เหลือเวลา: {formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        alignItems: 'center'
      }}>
        {/* Left: Artwork */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          minHeight: 200
        }}>
          <div style={{
            position: 'absolute',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: isItem 
              ? 'rgba(165, 94, 234, 0.3)' 
              : (types[0] && TYPE_COLORS[types[0]] ? TYPE_COLORS[types[0]].bg : '#f39c12'),
            opacity: 0.3,
            filter: 'blur(40px)'
          }} />
          <img
            src={flashAuction.item_icon_url || flashAuction.artwork_url || flashAuction.sprite_url}
            alt={flashAuction.name}
            className="floating-pokemon"
            style={{
              width: isItem ? 120 : 'auto',
              height: isItem ? 120 : 'auto',
              maxHeight: 180,
              maxWidth: 200,
              objectFit: 'contain',
              imageRendering: isItem ? 'pixelated' : 'auto',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.7))'
            }}
          />
        </div>

        {/* Middle: Details & Stats */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
              {isItem ? (flashAuction.item_name || flashAuction.name || flashAuction.title) : flashAuction.name}
            </h2>
            {!isItem && flashAuction.pokemon_id && (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                #{flashAuction.pokemon_id}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {isItem ? (
              <span className="badge" style={{ background: 'rgba(165, 94, 234, 0.2)', color: '#a55eea', border: '1px solid #a55eea' }}>
                {flashAuction.item_category || 'ITEM'}
              </span>
            ) : (
              types.map(t => {
                const conf = TYPE_COLORS[t] || { bg: '#444', text: '#fff' };
                return (
                  <span key={t} className="badge" style={{ background: conf.bg, color: conf.text }}>
                    {t}
                  </span>
                );
              })
            )}
            <span className="badge" style={{ color: rarityStyle.color, background: rarityStyle.bg, border: `1px solid ${rarityStyle.border}` }}>
              {flashAuction.rarity}
            </span>
          </div>

          {isItem ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 18, maxWidth: 500, lineHeight: 1.5 }}>
              {flashAuction.item_description || 'ไอเท็มหายากระดับพรีเมียม สวมใส่เพื่อเพิ่มพลังหรือปลดล็อคท่าพิเศษ'}
            </p>
          ) : (
            <>
              {/* Mini Stats Display */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '10px 16px',
                borderRadius: 12,
                marginBottom: 16,
                maxWidth: 420,
                fontSize: '0.85rem'
              }}>
                <div>HP: <b style={{ color: '#fff' }}>{stats.hp || 100}</b></div>
                <div>ATK: <b style={{ color: '#fff' }}>{stats.attack || 100}</b></div>
                <div>SPD: <b style={{ color: '#fff' }}>{stats.speed || 100}</b></div>
              </div>
            </>
          )}

          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            เหล่าเทรนเนอร์แข่งขันเสนอราคากันแบบสดๆ เมื่อหมดเวลา 5 นาที {isItem ? 'ไอเท็มหายากจะถูกส่งเข้ากระเป๋า' : 'โปเกมอนจะถูกโอนให้'}ผู้ชนะทันทีและระบบจะสุ่มรอบใหม่!
          </p>
        </div>

        {/* Right: Bidding Controls */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-glass)',
          borderRadius: 16,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ราคาเสนอสูงสุดขณะนี้:</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f39c12' }}>
              {parseFloat(flashAuction.current_bid).toLocaleString()} <span style={{ fontSize: '1rem' }}>FUKU</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>ผู้นำการประมูล:</span>
            <span style={{ fontWeight: 700, color: isHighestBidder ? '#2ed573' : '#00d2ff', display: 'flex', alignItems: 'center', gap: 4 }}>
              {isHighestBidder ? 'คุณกำลังนำอยู่!' : `@${flashAuction.highest_bidder_name || 'ยังไม่มีผู้เสนอ'}`}
            </span>
          </div>

          {flashAuction.buyout_price && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              <span>ราคาซื้อทันที:</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                {parseFloat(flashAuction.buyout_price).toLocaleString()} FUKU
              </span>
            </div>
          )}

          <button
            onClick={() => onOpenBid(flashAuction)}
            disabled={timeLeft <= 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 0', fontSize: '1rem' }}
          >
            <Gavel size={18} />
            <span>{timeLeft <= 0 ? 'กำลังปิดประมูล...' : 'แย่งประมูลใน Flash Auction'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

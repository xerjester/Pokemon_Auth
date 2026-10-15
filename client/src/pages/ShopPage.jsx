import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, Heart, Shield, Zap, Check, AlertCircle, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ShopPage({ user, onRefreshUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [buyingId, setBuyingId] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchShopItems();
  }, [activeCategory]);

  const fetchShopItems = async () => {
    setLoading(true);
    try {
      const url = activeCategory === 'ALL' 
        ? '/api/items/shop' 
        : `/api/items/shop?category=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch shop items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item) => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อสินค้า');
      return;
    }

    setBuyingId(item.id);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item.id, quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'การสั่งซื้อล้มเหลว');

      setNotification({
        type: 'success',
        message: `สั่งซื้อ ${item.name} สำเร็จ! ส่งเข้าสู่กระเป๋าของคุณแล้ว`
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onRefreshUser) onRefreshUser();

      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setBuyingId(null);
    }
  };

  const categories = [
    { key: 'ALL', label: 'ทั้งหมด (All Items)' },
    { key: 'BATTLE', label: 'ยาและฟื้นฟู (Battle Items)' },
    { key: 'HELD', label: 'ไอเท็มสวมใส่ (Held Items)' },
    { key: 'MEGA_STONE', label: 'หินเมก้า (Mega Stones)' },
    { key: 'Z_CRYSTAL', label: 'Z-Crystals' },
    { key: 'DYNAMAX', label: 'Dynamax Bands' }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 35, 55, 0.9) 0%, rgba(10, 18, 30, 0.95) 100%)',
        border: '1px solid rgba(0, 210, 255, 0.3)',
        borderRadius: 24,
        padding: '32px 36px',
        marginBottom: 32,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0, 210, 255, 0.15)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            color: '#00d2ff',
            padding: '6px 14px',
            borderRadius: 9999,
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: 12
          }}>
            <ShoppingBag size={15} />
            <span>OFFICIAL POKÉMART</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 8px 0' }}>
            ร้านค้าไอเท็มโปเกมอน (PokéMart)
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', maxWidth: 650 }}>
            เลือกซื้อยารักษา, ชุบชีวิต, ไอเท็มสวมใส่สำหรับคอมโบต่อสู้, หิน Mega Stones, และผลึก Z-Crystals ด้วยเหรียญ <b>FUKU</b>
          </p>
        </div>

        {/* User Balance Card */}
        {user && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            padding: '16px 24px',
            borderRadius: 16,
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>
              ยอดเหรียญของคุณ:
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={22} />
              <span>{parseFloat(user.fuku_balance || 0).toLocaleString()} FUKU</span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div style={{
          background: notification.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
          border: `1px solid ${notification.type === 'success' ? '#2ed573' : '#ff4757'}`,
          color: notification.type === 'success' ? '#2ed573' : '#ff6b81',
          padding: '14px 20px',
          borderRadius: 12,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'slideUp 0.3s ease'
        }}>
          {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: 600 }}>{notification.message}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {categories.map(cat => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                background: isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#000' : 'var(--text-main)',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                padding: '10px 18px',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Item Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          กำลังโหลดสินค้าในร้าน...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          ไม่มีรายการสินค้าในหมวดหมู่นี้
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {items.map(item => {
            const isBuying = buyingId === item.id;
            return (
              <div
                key={item.id}
                className="pokemon-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 20,
                  border: item.rarity === 'Legendary' || item.rarity === 'Mythical' 
                    ? '1px solid rgba(243, 156, 18, 0.4)' 
                    : '1px solid var(--border-glass)'
                }}
              >
                {/* Category & Rarity Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span className="badge" style={{
                    background: item.category === 'MEGA_STONE' ? 'rgba(155, 81, 224, 0.2)' :
                                item.category === 'Z_CRYSTAL' ? 'rgba(243, 156, 18, 0.2)' :
                                item.category === 'DYNAMAX' ? 'rgba(255, 71, 87, 0.2)' : 'rgba(0, 210, 255, 0.2)',
                    color: item.category === 'MEGA_STONE' ? '#9b51e0' :
                           item.category === 'Z_CRYSTAL' ? '#f39c12' :
                           item.category === 'DYNAMAX' ? '#ff4757' : '#00d2ff'
                  }}>
                    {item.category}
                  </span>
                  <span className="badge" style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: item.rarity === 'Legendary' || item.rarity === 'Mythical' ? '#f1c40f' : 'var(--text-dim)'
                  }}>
                    {item.rarity}
                  </span>
                </div>

                {/* Item Icon */}
                <div style={{
                  height: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, rgba(0, 210, 255, 0.05) 60%, transparent 85%)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 18,
                  position: 'relative'
                }}>
                  <img
                    src={item.icon_url}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: 78,
                      height: 78,
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.7))',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </div>

                {/* Name & Description */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', flex: 1, marginBottom: 16, lineHeight: 1.4 }}>
                  {item.description}
                </p>

                {/* Target restriction badge if applicable */}
                {item.target_pokemon && (
                  <div style={{ fontSize: '0.75rem', color: '#00d2ff', marginBottom: 12 }}>
                    เฉพาะ: <b>{item.target_pokemon}</b>
                  </div>
                )}

                {/* Price & Buy Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-glass)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ราคา:</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f39c12' }}>
                      {parseFloat(item.price_fuku).toLocaleString()} FUKU
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(item)}
                    disabled={isBuying}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <ShoppingBag size={14} />
                    <span>{isBuying ? 'กำลังสั่งซื้อ...' : 'ซื้อทันที'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Heart, Shield, Sparkles, AlertCircle, ShoppingBag } from 'lucide-react';

export default function InBattleBagModal({ isOpen, onClose, onUseItem, userTeam = [], activeIndex = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(activeIndex);

  useEffect(() => {
    if (isOpen) {
      fetchMyItems();
      setSelectedTarget(activeIndex);
      setSelectedItem(null);
    }
  }, [isOpen, activeIndex]);

  const fetchMyItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/my-items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Filter only consumable battle items
      const battleUsable = (data.items || []).filter(
        i => i.category === 'BATTLE' && i.quantity > 0
      );
      setItems(battleUsable);
      if (battleUsable.length > 0) {
        setSelectedItem(battleUsable[0]);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUse = () => {
    if (!selectedItem) return;
    onUseItem(selectedItem.id, selectedTarget);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'rgba(46, 213, 115, 0.15)',
              padding: 8,
              borderRadius: 10,
              color: '#2ed573'
            }}>
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>กระเป๋าไอเท็ม (Battle Bag)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                เลือกไอเท็มฟื้นฟูหรือชุบชีวิตเพื่อใช้ในเทิร์นนี้
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            กำลังเปิดกระเป๋า...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
            <AlertCircle size={40} style={{ color: '#ff4757', marginBottom: 10 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>ไม่มีไอเท็มต่อสู้ในกระเป๋าของคุณ</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              สามารถซื้อ Potion, Revive และไอเท็มอื่นๆ ได้ที่ร้านค้า <b>PokéMart</b>
            </p>
          </div>
        ) : (
          <div>
            {/* Item List */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
              maxHeight: 220,
              overflowY: 'auto',
              marginBottom: 20,
              paddingRight: 4
            }}>
              {items.map(item => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: isSelected ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                      padding: '10px 12px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      color: '#fff',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 50,
                      height: 50,
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img src={item.icon_url} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#2ed573', fontWeight: 600 }}>
                        จำนวน: x{item.quantity}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Item Description */}
            {selectedItem && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-glass)',
                padding: '12px 16px',
                borderRadius: 12,
                marginBottom: 20
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: 8 }}>
                  {selectedItem.description}
                </div>

                {/* Target Selection */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  ใช้กับโปเกมอนตัวใด:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {userTeam.map((p, idx) => {
                    const isTarget = selectedTarget === idx;
                    const isFainted = p.hp <= 0;
                    const isRevive = selectedItem.effect_type === 'REVIVE';
                    const disabled = isRevive ? !isFainted : isFainted;

                    return (
                      <button
                        key={idx}
                        disabled={disabled}
                        onClick={() => setSelectedTarget(idx)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: isTarget ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: isTarget ? '1px solid #2ed573' : '1px solid var(--border-glass)',
                          padding: '6px 10px',
                          borderRadius: 8,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.35 : 1,
                          color: '#fff',
                          fontSize: '0.75rem',
                          textAlign: 'left'
                        }}
                      >
                        <img src={p.sprite} alt={p.nickname} style={{ width: 28, height: 28 }} />
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</div>
                          <div style={{ fontSize: '0.65rem', color: isFainted ? '#ff4757' : 'var(--text-dim)' }}>
                            {isFainted ? 'หมดสติ' : `${p.hp}/${p.maxHp}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmUse}
                disabled={!selectedItem}
                className="btn btn-primary"
                style={{ flex: 2, background: 'linear-gradient(135deg, #2ed573 0%, #10ac84 100%)', border: 'none' }}
              >
                <Heart size={16} />
                <span>ยืนยันการใช้ไอเท็ม</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

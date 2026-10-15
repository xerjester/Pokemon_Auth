import React, { useState, useEffect } from 'react';
import { X, Shield, Sparkles, Check, AlertCircle, Trash2 } from 'lucide-react';

export default function EquipItemModal({ isOpen, onClose, pokemon, onEquipSuccess }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [equipping, setEquipping] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && pokemon) {
      fetchEquipableItems();
      setError('');
    }
  }, [isOpen, pokemon]);

  const fetchEquipableItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/my-items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Only items that can be equipped (HELD, MEGA_STONE, Z_CRYSTAL, DYNAMAX)
      const equipable = (data.items || []).filter(
        i => ['HELD', 'MEGA_STONE', 'Z_CRYSTAL', 'DYNAMAX'].includes(i.category) && i.quantity > 0
      );
      setItems(equipable);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (itemId) => {
    setEquipping(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userPokemonId: pokemon.id,
          itemId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสวมใส่ไอเท็มได้');

      if (onEquipSuccess) onEquipSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEquipping(false);
    }
  };

  const handleUnequip = async () => {
    setEquipping(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/unequip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userPokemonId: pokemon.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถถอดไอเท็มได้');

      if (onEquipSuccess) onEquipSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEquipping(false);
    }
  };

  if (!isOpen || !pokemon) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={pokemon.sprite_url || pokemon.sprite} alt={pokemon.nickname} style={{ width: 44, height: 44 }} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                สวมใส่ไอเท็มให้ {pokemon.nickname || pokemon.name}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {pokemon.held_item_name ? `กำลังถือ: ${pokemon.held_item_name}` : 'ยังไม่ได้สวมใส่ไอเท็ม'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 71, 87, 0.15)',
            border: '1px solid rgba(255, 71, 87, 0.4)',
            color: '#ff6b81',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: '0.85rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Held Item & Unequip Option */}
        {pokemon.held_item_name && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(241, 196, 15, 0.1)',
            border: '1px solid rgba(241, 196, 15, 0.3)',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 18
          }}>
            <div style={{ fontSize: '0.9rem', color: '#f1c40f', fontWeight: 700 }}>
              ไอเท็มปัจจุบัน: {pokemon.held_item_name}
            </div>
            <button
              onClick={handleUnequip}
              disabled={equipping}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: '#ff4757', color: '#ff4757' }}
            >
              <Trash2 size={14} />
              <span>ถอดไอเท็ม</span>
            </button>
          </div>
        )}

        {/* Available Items */}
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>
          เลือกไอเท็มสวมใส่จากกระเป๋า:
        </h4>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
            กำลังค้นหาไอเท็มในกระเป๋า...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>ไม่มีไอเท็มสวมใส่หรือหินเมก้าในกระเป๋าของคุณ</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 4 }}>
              สามารถซื้อได้ที่หน้าร้านค้า PokéMart หรือแย่งประมูลใน Flash Mystery Auction
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
            {items.map(item => {
              const isCurrent = pokemon.held_item_id === item.id;
              const isRestricted = item.target_pokemon && !pokemon.name.toLowerCase().includes(item.target_pokemon.toLowerCase());

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isCurrent ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrent ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                    padding: '10px 14px',
                    borderRadius: 12,
                    opacity: isRestricted ? 0.4 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 54,
                      height: 54,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img src={item.icon_url} alt={item.name} style={{ width: 44, height: 44, objectFit: 'contain', imageRendering: 'pixelated' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{item.name}</span>
                        <span className="badge" style={{
                          background: item.category === 'MEGA_STONE' ? 'rgba(155, 81, 224, 0.2)' : 'rgba(0, 210, 255, 0.2)',
                          color: item.category === 'MEGA_STONE' ? '#9b51e0' : '#00d2ff',
                          fontSize: '0.65rem'
                        }}>
                          {item.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isCurrent || isRestricted || equipping}
                    onClick={() => handleEquip(item.id)}
                    className="btn btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      marginLeft: 12,
                      background: isCurrent ? 'rgba(46, 204, 113, 0.3)' : undefined
                    }}
                  >
                    {isCurrent ? <Check size={14} /> : 'สวมใส่'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

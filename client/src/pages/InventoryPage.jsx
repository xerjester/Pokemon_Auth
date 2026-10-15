import React, { useState, useEffect } from 'react';
import { Package, Shield, Swords, Sparkles, Flame, Coins, Edit3, Trash2, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { TYPE_COLORS, RARITY_STYLES } from '../utils/typeColors';
import SkillManagerModal from '../components/SkillManagerModal';
import CreateAuctionModal from '../components/CreateAuctionModal';
import EquipItemModal from '../components/EquipItemModal';

export default function InventoryPage({ user, onRefreshUser, onNavigateToShop }) {
  const [activeTab, setActiveTab] = useState('pokemon'); // 'pokemon' | 'items'
  const [pokemons, setPokemons] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForSkills, setSelectedForSkills] = useState(null);
  const [selectedForAuction, setSelectedForAuction] = useState(false);
  const [selectedForEquip, setSelectedForEquip] = useState(null);
  const [editingNicknameId, setEditingNicknameId] = useState(null);
  const [newNickname, setNewNickname] = useState('');

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchMyItems();
    }
  }, [user]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPokemons(data.pokemons || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyItems = async () => {
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/items/my-items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUserItems(data.items || []);
    } catch (err) {
      console.error('Error fetching my items:', err);
    }
  };

  const handleToggleTeam = async (pokemon) => {
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/inventory/toggle-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userPokemonId: pokemon.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการจัดทีม');

      alert(data.message);
      fetchInventory();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQuickSell = async (pokemon) => {
    const sellPrice = Math.round(parseFloat(pokemon.base_price) * 0.7);
    if (!confirm(`คุณต้องการขายด่วน ${pokemon.nickname || pokemon.name} ในราคา ${sellPrice.toLocaleString()} FUKU หรือไม่?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/inventory/quick-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userPokemonId: pokemon.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ขายด่วนไม่สำเร็จ');

      alert(data.message);
      fetchInventory();
      if (onRefreshUser) onRefreshUser();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveNickname = async (id) => {
    try {
      const token = localStorage.getItem('pokemon_token');
      await fetch(`/api/inventory/${id}/nickname`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nickname: newNickname })
      });
      setEditingNicknameId(null);
      setNewNickname('');
      fetchInventory();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <Package size={64} style={{ color: 'var(--text-dim)', marginBottom: 16 }} />
        <h2>กรุณาเข้าสู่ระบบเพื่อดูคลังของคุณ</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          เข้าสู่ระบบเพื่อจัดการโปเกมอน สวมใส่ไอเท็ม และจัดทีมต่อสู้
        </p>
      </div>
    );
  }

  const teamCount = pokemons.filter(p => p.is_in_team).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>คลังและกระเป๋าของฉัน</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            จัดการโปเกมอน สวมใส่ไอเท็ม/หินเมก้า และจัดทีมสู้ศึก 3v3
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setSelectedForAuction(true)}
            className="btn btn-primary"
            style={{ padding: '10px 20px' }}
          >
            <Coins size={18} />
            <span>เปิดการประมูลใหม่</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => setActiveTab('pokemon')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'pokemon' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'pokemon' ? '#000' : '#fff',
            border: activeTab === 'pokemon' ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
            padding: '10px 20px',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}
        >
          <Package size={18} />
          <span>โปเกมอนของฉัน ({pokemons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('items')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: activeTab === 'items' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'items' ? '#000' : '#fff',
            border: activeTab === 'items' ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
            padding: '10px 20px',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}
        >
          <ShoppingBag size={18} />
          <span>กระเป๋าไอเท็ม ({userItems.reduce((acc, i) => acc + (i.quantity || 0), 0)})</span>
        </button>
      </div>

      {/* TAB 1: POKÉMON */}
      {activeTab === 'pokemon' && (
        <>
          {/* Team Capacity Indicator */}
          <div style={{
            background: 'rgba(0, 210, 255, 0.06)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            padding: '14px 20px',
            borderRadius: 14,
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} style={{ color: '#00d2ff' }} />
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>ทีมต่อสู้ปัจจุบัน: </span>
                <span style={{ color: teamCount === 3 ? '#2ed573' : '#00d2ff', fontWeight: 800 }}>
                  {teamCount} / 3 ตัว
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginLeft: 8 }}>
                  (จัดทีมได้สูงสุด 3 ตัวเพื่อลงสนาม Gym และ PvP)
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
              กำลังโหลดคลังโปเกมอน...
            </div>
          ) : pokemons.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border-glass)'
            }}>
              <Package size={48} style={{ color: 'var(--text-dim)', marginBottom: 16 }} />
              <h3>คลังโปเกมอนของคุณยังว่างอยู่</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                ไปที่หน้าการประมูลเพื่อประมูลโปเกมอนตัวแรกของคุณด้วยเหรียญ FUKU!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24
            }}>
              {pokemons.map(p => {
                const types = Array.isArray(p.types) ? p.types : JSON.parse(p.types || '[]');
                const stats = typeof p.stats === 'object' ? p.stats : JSON.parse(p.stats || '{}');
                const moves = Array.isArray(p.moves) ? p.moves : JSON.parse(p.moves || '[]');
                const rarityStyle = RARITY_STYLES[p.rarity] || RARITY_STYLES.Common;

                return (
                  <div
                    key={p.id}
                    className="pokemon-card"
                    style={{
                      border: p.is_in_team ? '2px solid #00d2ff' : `1px solid ${rarityStyle.border}`,
                      boxShadow: p.is_in_team ? '0 0 20px rgba(0, 210, 255, 0.25)' : 'none'
                    }}
                  >
                    {/* Badges Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="badge" style={{ color: rarityStyle.color, background: rarityStyle.bg, border: `1px solid ${rarityStyle.border}` }}>
                        <Sparkles size={11} />
                        {p.rarity}
                      </span>

                      {p.is_in_team ? (
                        <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.2)', color: '#00d2ff', border: '1px solid #00d2ff' }}>
                          <Shield size={12} />
                          ทีมหลัก (สล็อต {p.team_position})
                        </span>
                      ) : p.is_for_sale ? (
                        <span className="badge" style={{ background: 'rgba(255, 71, 87, 0.2)', color: '#ff4757', border: '1px solid #ff4757' }}>
                          <Flame size={12} />
                          กำลังเปิดประมูล
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)' }}>
                          อยู่ในคลัง
                        </span>
                      )}
                    </div>

                    {/* Artwork */}
                    <div className="pokemon-card-art">
                      <img src={p.artwork_url || p.sprite_url} alt={p.name} />
                    </div>

                    {/* Name & Nickname */}
                    <div style={{ marginBottom: 8 }}>
                      {editingNicknameId === p.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={newNickname}
                            onChange={e => setNewNickname(e.target.value)}
                            placeholder={p.name}
                            style={{
                              flex: 1,
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: 6,
                              padding: '4px 8px',
                              color: '#fff',
                              fontSize: '0.9rem'
                            }}
                          />
                          <button onClick={() => handleSaveNickname(p.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                            บันทึก
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                            {p.nickname || p.name}
                            {p.nickname && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>({p.name})</span>}
                          </h3>
                          <button 
                            onClick={() => {
                              setEditingNicknameId(p.id);
                              setNewNickname(p.nickname || p.name);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                            title="เปลี่ยนชื่อเล่น"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        HP สูงสุด: <b>{p.max_hp}</b>
                      </div>
                    </div>

                    {/* Types */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {types.map(t => {
                        const conf = TYPE_COLORS[t.toLowerCase()] || { bg: '#444', text: '#fff' };
                        return (
                          <span key={t} className="badge" style={{ background: conf.bg, color: conf.text }}>
                            {t}
                          </span>
                        );
                      })}
                    </div>

                    {/* Held Item Slot */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: '0.75rem', color: p.held_item_name ? '#f1c40f' : 'var(--text-dim)', fontWeight: 600 }}>
                        {p.held_item_name ? `ไอเท็ม: ${p.held_item_name}` : 'ยังไม่ได้สวมใส่ไอเท็ม'}
                      </div>
                      <button
                        onClick={() => setSelectedForEquip(p)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#00d2ff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {p.held_item_name ? 'เปลี่ยนไอเท็ม' : '+ สวมใส่'}
                      </button>
                    </div>

                    {/* Equipped Skills */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 14
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          สกิลต่อสู้ ({moves.length}/4)
                        </span>
                        <button
                          onClick={() => setSelectedForSkills(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Sparkles size={12} />
                          <span>จัดสกิล</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {moves.length === 0 ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', gridColumn: 'span 2' }}>
                            ยังไม่ได้ติดตั้งสกิล (คลิก "จัดสกิล" เพื่อเลือก 4 ท่า)
                          </div>
                        ) : (
                          moves.map(m => (
                            <div
                              key={m.name}
                              style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                padding: '4px 6px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{m.name}</span>
                              <span style={{ color: 'var(--text-dim)' }}>{m.power || '-'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button
                        onClick={() => handleToggleTeam(p)}
                        disabled={p.is_for_sale}
                        className={`btn ${p.is_in_team ? 'btn-danger' : 'btn-cyan'}`}
                        style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}
                      >
                        <Shield size={15} />
                        <span>{p.is_in_team ? 'ปลดจากทีม' : 'จัดเข้าทีม'}</span>
                      </button>

                      <button
                        onClick={() => handleQuickSell(p)}
                        disabled={p.is_in_team || p.is_for_sale}
                        className="btn btn-outline"
                        title={`ขายด่วนเพื่อรับ ${Math.round(parseFloat(p.base_price) * 0.7).toLocaleString()} FUKU`}
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        <Coins size={15} style={{ color: '#f39c12' }} />
                        <span>ขายด่วน</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MY ITEMS */}
      {activeTab === 'items' && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>ไอเท็มทั้งหมดในกระเป๋า ({userItems.length} ชนิด)</h2>
            {onNavigateToShop && (
              <button onClick={onNavigateToShop} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <ShoppingBag size={15} />
                <span>ไปร้านค้า PokéMart</span>
              </button>
            )}
          </div>

          {userItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 20 }}>
              <ShoppingBag size={48} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
              <h3>กระเป๋าไอเท็มของคุณยังว่างเปล่า</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                คุณสามารถซื้อ Potion, หิน Mega Stones, หรือ Z-Crystals ได้ที่ร้านค้า
              </p>
              {onNavigateToShop && (
                <button onClick={onNavigateToShop} className="btn btn-primary" style={{ marginTop: 16 }}>
                  เข้าร้านค้า PokéMart
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {userItems.map(item => (
                <div
                  key={item.user_item_id || item.id}
                  className="pokemon-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{
                    width: 76,
                    height: 76,
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 210, 255, 0.04) 70%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img 
                      src={item.icon_url} 
                      alt={item.name} 
                      loading="lazy"
                      decoding="async"
                      style={{ width: 60, height: 60, objectFit: 'contain', imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} 
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.name}</span>
                      <span className="badge" style={{ background: '#2ed57322', color: '#2ed573', fontWeight: 800 }}>
                        x{item.quantity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.3 }}>
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedForSkills && (
        <SkillManagerModal
          pokemon={selectedForSkills}
          onClose={() => setSelectedForSkills(null)}
          onUpdateSuccess={() => {
            setSelectedForSkills(null);
            fetchInventory();
          }}
        />
      )}

      {selectedForAuction && (
        <CreateAuctionModal
          userPokemons={pokemons.filter(p => !p.is_in_team && !p.is_for_sale)}
          onClose={() => setSelectedForAuction(false)}
          onCreateSuccess={() => {
            setSelectedForAuction(false);
            fetchInventory();
          }}
        />
      )}

      {selectedForEquip && (
        <EquipItemModal
          isOpen={Boolean(selectedForEquip)}
          onClose={() => setSelectedForEquip(null)}
          pokemon={selectedForEquip}
          onEquipSuccess={() => {
            fetchInventory();
            fetchMyItems();
          }}
        />
      )}
    </div>
  );
}

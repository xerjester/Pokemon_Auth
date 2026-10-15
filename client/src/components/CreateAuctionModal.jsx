import React, { useState } from 'react';
import { X, Flame, AlertCircle, Coins, Clock } from 'lucide-react';

export default function CreateAuctionModal({ userPokemons, onClose, onCreateSuccess }) {
  const availablePokemons = userPokemons.filter(p => !p.is_in_team && !p.is_for_sale);

  const [selectedId, setSelectedId] = useState(availablePokemons[0]?.id || '');
  const [startBid, setStartBid] = useState(1000);
  const [buyoutPrice, setBuyoutPrice] = useState(2500);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPokemon = availablePokemons.find(p => p.id === parseInt(selectedId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setError('กรุณาเลือกโปเกมอนที่ต้องการเปิดประมูล');
      return;
    }
    if (startBid <= 0) {
      setError('ราคาเริ่มต้นต้องมากกว่า 0');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/auctions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userPokemonId: selectedId,
          startBid,
          buyoutPrice: buyoutPrice || null,
          durationMinutes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างรายการประมูลไม่สำเร็จ');

      alert(data.message || 'สร้างรายการประมูลสำเร็จ!');
      onCreateSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 71, 87, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff4757'
            }}>
              <Flame size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>เปิดการประมูลโปเกมอนใหม่</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>นำโปเกมอนจากคลังมาประมูลขายเพื่อรับ FUKU</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 71, 87, 0.15)',
            border: '1px solid rgba(255, 71, 87, 0.4)',
            color: '#ff6b81',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.85rem',
            marginBottom: 16
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {availablePokemons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            ไม่มีโปเกมอนที่สามารถนำมาประมูลได้ (โปเกมอนในทีมต่อสู้หรือที่เปิดประมูลอยู่แล้วจะไม่สามารถเลือกได้)
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                เลือกโปเกมอนจากคลัง:
              </label>
              <select
                value={selectedId}
                onChange={e => {
                  setSelectedId(e.target.value);
                  const p = availablePokemons.find(item => item.id === parseInt(e.target.value));
                  if (p) {
                    setStartBid(p.base_price || 1000);
                    setBuyoutPrice(Math.round((p.base_price || 1000) * 2.2));
                  }
                }}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              >
                {availablePokemons.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#111625' }}>
                    {p.nickname ? `${p.nickname} (${p.name})` : p.name} — ({p.rarity})
                  </option>
                ))}
              </select>
            </div>

            {selectedPokemon && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--border-glass)'
              }}>
                <img 
                  src={selectedPokemon.artwork_url || selectedPokemon.sprite_url} 
                  alt={selectedPokemon.name} 
                  style={{ width: 50, height: 50, objectFit: 'contain' }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedPokemon.nickname ? `${selectedPokemon.nickname} (${selectedPokemon.name})` : selectedPokemon.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    ความหายาก: {selectedPokemon.rarity} | ราคาประเมิน: {parseFloat(selectedPokemon.base_price).toLocaleString()} FUKU
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  ราคาเริ่มต้น (FUKU):
                </label>
                <input
                  type="number"
                  value={startBid}
                  onChange={e => setStartBid(parseFloat(e.target.value) || 0)}
                  min="100"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  ราคาซื้อทันที Buyout (ไม่บังคับ):
                </label>
                <input
                  type="number"
                  value={buyoutPrice}
                  onChange={e => setBuyoutPrice(parseFloat(e.target.value) || 0)}
                  placeholder="ว่างไว้หากไม่มี"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                ระยะเวลาประมูล:
              </label>
              <select
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              >
                <option value={1} style={{ background: '#111625' }}>1 นาที (ทดสอบด่วนพิเศษ)</option>
                <option value={2} style={{ background: '#111625' }}>2 นาที (แนะนำสำหรับทดสอบ)</option>
                <option value={5} style={{ background: '#111625' }}>5 นาที</option>
                <option value={10} style={{ background: '#111625' }}>10 นาที</option>
                <option value={30} style={{ background: '#111625' }}>30 นาที</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" onClick={onClose} className="btn btn-outline">
                ยกเลิก
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                {loading ? 'กำลังเปิดประมูล...' : 'เปิดการประมูลทันที'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

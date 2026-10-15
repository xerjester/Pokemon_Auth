import React, { useState, useEffect } from 'react';
import { X, Sparkles, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { TYPE_COLORS } from '../utils/typeColors';

export default function SkillManagerModal({ pokemon, onClose, onSaveSuccess }) {
  const [availableMoves, setAvailableMoves] = useState([]);
  const [selectedMoves, setSelectedMoves] = useState(pokemon.moves || []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMoves();
  }, [pokemon.id]);

  const fetchMoves = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch(`/api/skills/moves/${pokemon.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ดึงข้อมูลสกิลไม่สำเร็จ');

      setAvailableMoves(data.availableMoves || []);
      setSelectedMoves(data.equippedMoves || pokemon.moves || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMove = (move) => {
    const isSelected = selectedMoves.some(m => m.name.toLowerCase() === move.name.toLowerCase());
    if (isSelected) {
      if (selectedMoves.length <= 1) {
        alert('โปเกมอนต้องมีสกิลต่อสู้อย่างน้อย 1 ท่า');
        return;
      }
      setSelectedMoves(prev => prev.filter(m => m.name.toLowerCase() !== move.name.toLowerCase()));
    } else {
      if (selectedMoves.length >= 4) {
        alert('ติดตั้งสกิลได้สูงสุด 4 ท่าเท่านั้น (กรุณาปลดท่าเดิมออกก่อน)');
        return;
      }
      setSelectedMoves(prev => [...prev, move]);
    }
  };

  const handleSave = async () => {
    if (selectedMoves.length === 0) {
      setError('กรุณาเลือกสกิลอย่างน้อย 1 ท่า');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/skills/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userPokemonId: pokemon.id,
          selectedMoves
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกสกิลไม่สำเร็จ');

      alert(data.message || 'บันทึกสกิลเรียบร้อยแล้ว!');
      onSaveSuccess(selectedMoves);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(0, 210, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>จัดแต่งสกิล (Custom Moveset)</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {pokemon.nickname || pokemon.name} — เลือกได้สูงสุด 4 ท่า ({selectedMoves.length}/4)
              </p>
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

        {/* Currently Equipped Moves (Max 4) */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
            สกิลที่กำลังติดตั้ง ({selectedMoves.length}/4):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {selectedMoves.map(m => {
              const conf = TYPE_COLORS[m.type?.toLowerCase()] || { bg: '#444', text: '#fff' };
              return (
                <div
                  key={m.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 210, 255, 0.4)',
                    padding: '10px 14px',
                    borderRadius: 10
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                      <span className="badge" style={{ background: conf.bg, color: conf.text, fontSize: '0.65rem' }}>
                        {m.type}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        พลัง: {m.power || '-'} | แม่น: {m.accuracy || 100}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleMove(m)}
                    style={{
                      background: 'rgba(255, 71, 87, 0.2)',
                      border: '1px solid rgba(255, 71, 87, 0.4)',
                      color: '#ff4757',
                      borderRadius: '50%',
                      width: 26,
                      height: 26,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Move Pool Selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
            คลังสกิลที่สามารถเรียนรู้ได้ (จาก PokéAPI):
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)' }}>
              กำลังโหลดสกิลจาก PokéAPI...
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 250,
              overflowY: 'auto',
              paddingRight: 6
            }}>
              {availableMoves.map(m => {
                const isSelected = selectedMoves.some(sm => sm.name.toLowerCase() === m.name.toLowerCase());
                const conf = TYPE_COLORS[m.type?.toLowerCase()] || { bg: '#444', text: '#fff' };

                return (
                  <div
                    key={m.name}
                    onClick={() => handleToggleMove(m)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid rgba(0, 210, 255, 0.4)' : '1px solid var(--border-glass)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.name}</span>
                        <span className="badge" style={{ background: conf.bg, color: conf.text, fontSize: '0.65rem' }}>
                          {m.type}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          [{m.damage_class}]
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {m.description || `พลังโจมตี: ${m.power || 60} | ความแม่นยำ: ${m.accuracy || 100}% | PP: ${m.pp || 15}`}
                      </div>
                    </div>

                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: isSelected ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                      background: isSelected ? '#00d2ff' : 'transparent',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '8px 18px' }}>
            ยกเลิก
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || selectedMoves.length === 0} 
            className="btn btn-primary"
            style={{ padding: '8px 24px' }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการจัดสกิล'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Shield, Swords, Sparkles, Plus, ArrowRight, User } from 'lucide-react';
import { TYPE_COLORS, RARITY_STYLES } from '../utils/typeColors';
import SkillManagerModal from '../components/SkillManagerModal';

export default function TeamPage({ user, onNavigateToBattle, onNavigateToInventory }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForSkills, setSelectedForSkills] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTeam();
    }
  }, [user]);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const teamOnly = (data.pokemons || []).filter(p => p.is_in_team);
      setTeam(teamOnly);
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  const slots = [1, 2, 3];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={32} style={{ color: 'var(--accent-cyan)' }} />
            <span>ทีมต่อสู้ของคุณ (Battle Squad 3v3)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            จัดทัพโปเกมอน 3 ตัวหลัก พร้อมเลือกติดตั้ง 4 สกิลเด็ดเพื่อเตรียมประลองในยิม
          </p>
        </div>

        <button
          onClick={onNavigateToBattle}
          disabled={team.length === 0}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '1rem' }}
        >
          <Swords size={20} />
          <span>เข้าสู่สนามประลองยิม</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* 3 Squad Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {slots.map(slotNum => {
          const mon = team.find(p => p.team_position === slotNum) || team[slotNum - 1];

          if (!mon) {
            return (
              <div
                key={slotNum}
                onClick={onNavigateToInventory}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '2px dashed var(--border-glass)',
                  borderRadius: 20,
                  minHeight: 440,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 24,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  marginBottom: 16
                }}>
                  <Plus size={30} />
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>สล็อตที่ {slotNum} ว่างอยู่</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                  คลิกที่นี่เพื่อไปเลือกโปเกมอนจากคลังเข้าสู่ทีม
                </p>
              </div>
            );
          }

          const types = Array.isArray(mon.types) ? mon.types : JSON.parse(mon.types || '[]');
          const stats = typeof mon.stats === 'object' ? mon.stats : JSON.parse(mon.stats || '{}');
          const moves = Array.isArray(mon.moves) ? mon.moves : JSON.parse(mon.moves || '[]');
          const rarityStyle = RARITY_STYLES[mon.rarity] || RARITY_STYLES.Common;

          return (
            <div
              key={mon.id}
              className="pokemon-card"
              style={{
                border: '1px solid rgba(0, 210, 255, 0.4)',
                boxShadow: '0 0 25px rgba(0, 210, 255, 0.15)',
                minHeight: 440,
                padding: 20
              }}
            >
              {/* Slot Indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="badge" style={{ background: '#00d2ff', color: '#000' }}>
                  {slotNum === 1 ? '⭐ หัวหน้าทีม (Lead)' : `สล็อตที่ ${slotNum}`}
                </span>
                <span className="badge" style={{ color: rarityStyle.color, background: rarityStyle.bg, border: `1px solid ${rarityStyle.border}` }}>
                  {mon.rarity}
                </span>
              </div>

              {/* Artwork */}
              <div className="pokemon-card-art" style={{ height: 160 }}>
                <img src={mon.artwork_url || mon.sprite_url} alt={mon.name} className="floating-pokemon" />
              </div>

              {/* Title & Stats */}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{mon.nickname || mon.name}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Max HP: {mon.max_hp}
                </div>
              </div>

              {/* Types */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                {types.map(t => {
                  const conf = TYPE_COLORS[t.toLowerCase()] || { bg: '#444', text: '#fff' };
                  return (
                    <span key={t} className="badge" style={{ background: conf.bg, color: conf.text }}>
                      {t}
                    </span>
                  );
                })}
              </div>

              {/* Skills summary */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    ท่าต่อสู้ที่ติดตั้ง ({moves.length}/4):
                  </span>
                  <button
                    onClick={() => setSelectedForSkills(mon)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={13} />
                    <span>เปลี่ยนสกิล</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {moves.map(m => {
                    const conf = TYPE_COLORS[m.type?.toLowerCase()] || { bg: '#333', text: '#fff' };
                    return (
                      <div
                        key={m.name}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-glass)',
                          padding: '6px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                          <span style={{ color: conf.bg }}>{m.type}</span>
                          <span>พลัง {m.power || 60}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => setSelectedForSkills(mon)}
                className="btn btn-outline"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                <Sparkles size={16} />
                <span>ปรับแต่งสกิลโปเกมอนตัวนี้</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Skill Manager Modal */}
      {selectedForSkills && (
        <SkillManagerModal
          pokemon={selectedForSkills}
          onClose={() => setSelectedForSkills(null)}
          onSaveSuccess={() => fetchTeam()}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Activity, Flame, Swords, Gavel, Trophy, User } from 'lucide-react';

export default function ActivityTicker() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/pvp/activities');
      const data = await res.json();
      if (data.activities) {
        setActivities(data.activities.slice(0, 8));
      }
    } catch (e) {
      // ignore
    }
  };

  if (activities.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(12, 17, 30, 0.9)',
      borderBottom: '1px solid var(--border-glass)',
      padding: '8px 24px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0, 210, 255, 0.15)',
          color: '#00d2ff',
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: '0.75rem',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          <Activity size={13} style={{ animation: 'pulseGlow 1.5s infinite' }} />
          <span>LIVE ACTIVITY</span>
        </div>

        <div style={{
          display: 'flex',
          gap: 24,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '2px 0'
        }}>
          {activities.map((act) => {
            return (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}
              >
                <img 
                  src={act.avatar} 
                  alt={act.username} 
                  style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain' }}
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src = 'https://play.pokemonshowdown.com/sprites/trainers/red.png';
                  }}
                />
                <span style={{ fontWeight: 700, color: '#fff' }}>@{act.username}</span>
                <span style={{ color: act.type === 'pvp_victory' ? '#f39c12' : act.type === 'bid' ? '#00d2ff' : 'var(--text-main)' }}>
                  {act.message}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>•</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

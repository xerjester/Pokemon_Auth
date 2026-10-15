import React, { useState, useEffect } from 'react';
import { Swords, X, Trophy, Coins, Clock, CheckCircle2 } from 'lucide-react';
import { battleAudio } from '../utils/battleAudio';

export default function IncomingPvPModal({ challenge, onAccept, onDecline, loading }) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!challenge) return;

    // Play battle alert sound
    try {
      battleAudio.play('attack');
    } catch (e) {
      // Audio autoplay policy
    }

    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - (challenge.createdAt || Date.now())) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        onDecline(challenge.id);
      }
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [challenge?.id]);

  if (!challenge) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 20
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #181329 0%, #0d1020 100%)',
        border: '1px solid rgba(46, 204, 113, 0.5)',
        borderRadius: 24,
        padding: '32px 28px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 0 45px rgba(46, 204, 113, 0.35)',
        position: 'relative'
      }}>
        {/* Challenger Avatar */}
        <div style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(46, 204, 113, 0.25) 0%, transparent 70%)',
          border: '2px solid #2ecc71',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src={challenge.challengerAvatar}
            alt={challenge.challengerUsername}
            style={{ width: 58, height: 58, objectFit: 'contain' }}
          />
        </div>

        {/* Header Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(46, 204, 113, 0.15)',
          border: '1px solid rgba(46, 204, 113, 0.35)',
          color: '#2ecc71',
          padding: '4px 14px',
          borderRadius: 9999,
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: 12
        }}>
          <Swords size={14} />
          <span>คำท้าประลอง PvP เข้ามาใหม่</span>
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
          @{challenge.challengerUsername} ท้าดวลกับคุณ!
        </h2>

        {/* Real player verification badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#2ecc71', fontSize: '0.78rem', marginBottom: 16 }}>
          <CheckCircle2 size={13} />
          <span>ผู้เล่นจริงในระบบ</span>
        </div>

        {/* Wager Information Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-glass)',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <Coins size={13} style={{ color: '#f39c12' }} />
              <span>เงินเดิมพัน</span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f39c12', marginTop: 2 }}>
              {(challenge.wager || 0).toLocaleString()} FUKU
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.1)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <Trophy size={13} style={{ color: '#00d2ff' }} />
              <span>เงินรางวัลผู้ชนะ</span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#00d2ff', marginTop: 2 }}>
              {((challenge.wager || 0) * 2).toLocaleString()} FUKU
            </div>
          </div>
        </div>

        {/* Challenger Team Preview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 14,
          padding: 12,
          marginBottom: 18,
          border: '1px solid var(--border-glass)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8 }}>
            ทีมโปเกมอนของคู่ต่อสู้:
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {(challenge.challengerTeamPreview || []).map((p, idx) => (
              <div key={idx} style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: '6px 10px', minWidth: 60 }}>
                <img src={p.sprite} alt={p.name} style={{ width: 38, height: 38, objectFit: 'contain' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 600, textTransform: 'capitalize' }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiry Timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          color: secondsLeft <= 15 ? '#ff4757' : 'var(--text-dim)',
          fontSize: '0.8rem',
          marginBottom: 20
        }}>
          <Clock size={14} />
          <span>หมดเวลาตอบรับใน <b>{secondsLeft}</b> วินาที</span>
        </div>

        {/* Action Buttons: Accept / Decline */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => onAccept(challenge.id)}
            disabled={loading}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 4px 15px rgba(46, 204, 113, 0.35)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Swords size={18} />
            <span>{loading ? 'กำลังเข้าสู่ห้อง...' : 'ตอบรับคำท้า'}</span>
          </button>
          <button
            onClick={() => onDecline(challenge.id)}
            disabled={loading}
            className="btn btn-outline"
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderColor: 'rgba(255, 71, 87, 0.4)',
              color: '#ff6b81',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <X size={18} />
            <span>ปฏิเสธ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

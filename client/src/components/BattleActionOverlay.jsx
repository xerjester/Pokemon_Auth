import React from 'react';
import { Sparkles, Flame, Zap, Droplets, Shield, Heart } from 'lucide-react';

export default function BattleActionOverlay({ activeEffect, floatingPopups = [] }) {
  // activeEffect: { target: 'user' | 'opponent', fxType: 'fire' | 'electric' | ..., isCrit: boolean, isZMove: boolean, isMega: boolean, isDynamax: boolean }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' }}>
      {/* 1. Elemental FX Burst on Target */}
      {activeEffect && (
        <div
          style={{
            position: 'absolute',
            ...(activeEffect.target === 'opponent'
              ? { top: '15%', right: '15%' }
              : { bottom: '25%', left: '15%' }),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {activeEffect.fxType === 'fire' && (
            <div style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 71, 87, 0.9) 0%, rgba(255, 107, 129, 0.5) 40%, transparent 70%)',
              boxShadow: '0 0 50px #ff4757, 0 0 80px #ff7f50',
              animation: 'hitShake 0.4s ease-out forwards',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={56} style={{ color: '#fff', filter: 'drop-shadow(0 0 10px #ffa502)' }} />
            </div>
          )}

          {activeEffect.fxType === 'electric' && (
            <div style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 242, 0, 0.9) 0%, rgba(241, 196, 15, 0.5) 50%, transparent 70%)',
              boxShadow: '0 0 50px #f1c40f, 0 0 80px #ffd32a',
              animation: 'hitShake 0.35s ease-out forwards',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={60} style={{ color: '#fff', filter: 'drop-shadow(0 0 12px #fffa65)' }} />
            </div>
          )}

          {(activeEffect.fxType === 'water' || activeEffect.fxType === 'ice') && (
            <div style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 210, 255, 0.9) 0%, rgba(52, 152, 219, 0.5) 50%, transparent 70%)',
              boxShadow: '0 0 50px #00d2ff, 0 0 80px #18dcff',
              animation: 'hitShake 0.4s ease-out forwards',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Droplets size={56} style={{ color: '#fff', filter: 'drop-shadow(0 0 10px #00d2ff)' }} />
            </div>
          )}

          {(activeEffect.fxType === 'psychic' || activeEffect.fxType === 'ghost' || activeEffect.fxType === 'dragon') && (
            <div style={{
              width: 130,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(155, 81, 224, 0.9) 0%, rgba(142, 68, 173, 0.5) 50%, transparent 70%)',
              boxShadow: '0 0 50px #9b51e0, 0 0 90px #8e44ad',
              animation: 'hitShake 0.4s ease-out forwards',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={56} style={{ color: '#fff', filter: 'drop-shadow(0 0 12px #9b51e0)' }} />
            </div>
          )}

          {(!['fire', 'electric', 'water', 'ice', 'psychic', 'ghost', 'dragon'].includes(activeEffect.fxType)) && (
            <div style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(241, 196, 15, 0.4) 50%, transparent 70%)',
              boxShadow: '0 0 45px rgba(255, 255, 255, 0.8)',
              animation: 'hitShake 0.35s ease-out forwards',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={50} style={{ color: '#f39c12' }} />
            </div>
          )}
        </div>
      )}

      {/* 2. Floating Damage / Status Popups */}
      {floatingPopups.map((popup) => (
        <div
          key={popup.id}
          className="damage-popup"
          style={{
            ...(popup.target === 'opponent'
              ? { top: '22%', right: '22%' }
              : { bottom: '30%', left: '22%' }),
            color: popup.isHeal ? '#2ecc71' : popup.isCrit ? '#ff3838' : '#fff',
            fontSize: popup.isSpecial ? '1.8rem' : '2.2rem',
            letterSpacing: '0.05em'
          }}
        >
          {popup.text}
          {popup.subText && (
            <div style={{
              fontSize: '0.85rem',
              color: popup.isCrit ? '#ff9f43' : '#00d2ff',
              fontWeight: 800,
              marginTop: 2
            }}>
              {popup.subText}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Swords, Trophy, Shield, ArrowRight, RefreshCw, Sparkles, AlertCircle, RotateCcw, ShoppingBag, Flame, Zap, Crown } from 'lucide-react';
import { TYPE_COLORS } from '../utils/typeColors';
import { battleAudio } from '../utils/battleAudio';
import BattleActionOverlay from '../components/BattleActionOverlay';
import InBattleBagModal from '../components/InBattleBagModal';
import confetti from 'canvas-confetti';
import { checkMegaEvolution, checkZMove } from '../utils/gimmickValidation';

export default function BattlePage({ user, onRefreshUser, onNavigateToTeam, onNavigateToFarm }) {
  const [gyms, setGyms] = useState([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [gymFilter, setGymFilter] = useState('all');
  const [activeBattle, setActiveBattle] = useState(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);

  // Gimmick toggles
  const [megaToggled, setMegaToggled] = useState(false);
  const [zMoveToggled, setZMoveToggled] = useState(false);
  const [dynamaxToggled, setDynamaxToggled] = useState(false);

  // Animation States
  const [userAttacking, setUserAttacking] = useState(false);
  const [oppAttacking, setOppAttacking] = useState(false);
  const [userHit, setUserHit] = useState(false);
  const [oppHit, setOppHit] = useState(false);
  const [actionEffect, setActionEffect] = useState(null);
  const [floatingPopups, setFloatingPopups] = useState([]);

  const logContainerRef = useRef(null);

  useEffect(() => {
    fetchGyms();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [activeBattle?.logs]);

  const fetchGyms = async () => {
    setLoadingGyms(true);
    try {
      const res = await fetch('/api/battle/gyms');
      const data = await res.json();
      setGyms(data.gyms || []);
    } catch (err) {
      console.error('Error fetching gyms:', err);
    } finally {
      setLoadingGyms(false);
    }
  };

  const getDifficultyBadge = (diff = '') => {
    if (diff.includes('Easy')) return { bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: 'rgba(46, 204, 113, 0.35)' };
    if (diff.includes('Normal')) return { bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db', border: 'rgba(52, 152, 219, 0.35)' };
    if (diff.includes('Hard')) return { bg: 'rgba(230, 126, 34, 0.15)', color: '#e67e22', border: 'rgba(230, 126, 34, 0.35)' };
    if (diff.includes('Expert')) return { bg: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', border: 'rgba(241, 196, 15, 0.35)' };
    if (diff.includes('Master')) return { bg: 'rgba(155, 81, 224, 0.2)', color: '#b36cf5', border: 'rgba(155, 81, 224, 0.45)' };
    if (diff.includes('Legendary')) return { bg: 'rgba(255, 71, 87, 0.22)', color: '#ff4757', border: 'rgba(255, 71, 87, 0.55)' };
    return { bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-main)', border: 'rgba(255, 255, 255, 0.1)' };
  };

  const getGymCardStyle = (diff = '') => {
    if (diff.includes('Legendary')) {
      return {
        border: '1px solid rgba(255, 71, 87, 0.6)',
        boxShadow: '0 0 26px rgba(255, 71, 87, 0.25)',
        background: 'linear-gradient(180deg, rgba(255, 71, 87, 0.07) 0%, rgba(20, 24, 33, 0.85) 100%)'
      };
    }
    if (diff.includes('Master')) {
      return {
        border: '1px solid rgba(155, 81, 224, 0.55)',
        boxShadow: '0 0 22px rgba(155, 81, 224, 0.22)',
        background: 'linear-gradient(180deg, rgba(155, 81, 224, 0.07) 0%, rgba(20, 24, 33, 0.85) 100%)'
      };
    }
    if (diff.includes('Expert')) {
      return {
        border: '1px solid rgba(241, 196, 15, 0.45)',
        boxShadow: '0 0 20px rgba(241, 196, 15, 0.18)',
        background: 'linear-gradient(180deg, rgba(241, 196, 15, 0.05) 0%, rgba(20, 24, 33, 0.85) 100%)'
      };
    }
    return {
      border: '1px solid var(--border-glass)',
      boxShadow: 'none',
      background: 'var(--card-bg)'
    };
  };

  const filteredGyms = gyms.filter(g => {
    if (gymFilter === 'all') return true;
    if (gymFilter === 'kanto') return g.region === 'kanto' || (!g.region && ['brock','misty','ltsurge','erika','koga','sabrina','blaine','giovanni'].includes(g.id));
    if (gymFilter === 'champions') return g.region === 'champions' || ['lance','cynthia','champion_red'].includes(g.id);
    return true;
  });

  const handleStartBattle = async (gymId) => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนเริ่มการต่อสู้');
      return;
    }

    setBattleLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/battle/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gymId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถเริ่มการต่อสู้ได้');

      setActiveBattle(data.battle);
      setMegaToggled(false);
      setZMoveToggled(false);
      setDynamaxToggled(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBattleLoading(false);
    }
  };

  // Play sequenced turn actions
  const playActionSequence = async (actions = [], finalBattle) => {
    for (const act of actions) {
      if (act.type === 'ACTION_ATTACK') {
        if (act.actor === 'user') {
          setUserAttacking(true);
          battleAudio.playMoveFx(act.fxType, act.isCrit);
          if (act.isMega) battleAudio.playMega();
          if (act.isZMove) battleAudio.playZMove();
          if (act.isDynamax) battleAudio.playDynamax();

          await new Promise(r => setTimeout(r, 220));
          setUserAttacking(false);
          setOppHit(true);
          setActionEffect({ target: 'opponent', fxType: act.fxType, isCrit: act.isCrit });

          const popupId = Date.now() + Math.random();
          let sub = '';
          if (act.isCrit) sub = 'CRITICAL HIT!';
          else if (act.typeMult > 1) sub = 'SUPER EFFECTIVE!';
          else if (act.typeMult < 1 && act.typeMult > 0) sub = 'NOT VERY EFFECTIVE...';

          setFloatingPopups(prev => [
            ...prev,
            { id: popupId, text: `-${act.damage}`, subText: sub, target: 'opponent', isCrit: act.isCrit }
          ]);

          await new Promise(r => setTimeout(r, 450));
          setOppHit(false);
          setActionEffect(null);
          setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
        } else {
          setOppAttacking(true);
          battleAudio.playMoveFx(act.fxType, act.isCrit);

          await new Promise(r => setTimeout(r, 220));
          setOppAttacking(false);
          setUserHit(true);
          setActionEffect({ target: 'user', fxType: act.fxType, isCrit: act.isCrit });

          const popupId = Date.now() + Math.random();
          let sub = '';
          if (act.isCrit) sub = 'CRITICAL HIT!';
          else if (act.typeMult > 1) sub = 'SUPER EFFECTIVE!';

          setFloatingPopups(prev => [
            ...prev,
            { id: popupId, text: `-${act.damage}`, subText: sub, target: 'user', isCrit: act.isCrit }
          ]);

          await new Promise(r => setTimeout(r, 450));
          setUserHit(false);
          setActionEffect(null);
          setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
        }
      } else if (act.type === 'ACTION_ITEM') {
        battleAudio.playHeal();
        const popupId = Date.now() + Math.random();
        setFloatingPopups(prev => [
          ...prev,
          { id: popupId, text: act.healAmount > 0 ? `+${act.healAmount} HP` : 'BUFF!', target: 'user', isHeal: true }
        ]);
        await new Promise(r => setTimeout(r, 600));
        setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
      } else if (act.type === 'ACTION_MEGA') {
        battleAudio.playMega();
        const popupId = Date.now() + Math.random();
        setFloatingPopups(prev => [
          ...prev,
          { id: popupId, text: 'MEGA EVOLUTION!', target: 'user', isSpecial: true }
        ]);
        await new Promise(r => setTimeout(r, 700));
        setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
      } else if (act.type === 'ACTION_DYNAMAX') {
        battleAudio.playDynamax();
        const popupId = Date.now() + Math.random();
        setFloatingPopups(prev => [
          ...prev,
          { id: popupId, text: 'DYNAMAX ACTIVATED!', target: 'user', isSpecial: true }
        ]);
        await new Promise(r => setTimeout(r, 700));
        setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
      } else if (act.type === 'ACTION_LEFTOVERS') {
        battleAudio.playHeal();
        const popupId = Date.now() + Math.random();
        setFloatingPopups(prev => [
          ...prev,
          { id: popupId, text: `+${act.healAmount} HP (Leftovers)`, target: 'user', isHeal: true }
        ]);
        await new Promise(r => setTimeout(r, 500));
        setFloatingPopups(prev => prev.filter(p => p.id !== popupId));
      } else if (act.type === 'ACTION_VICTORY') {
        confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.5 }
        });
        if (onRefreshUser) onRefreshUser();
      }
    }

    // Set final state after sequence concludes
    setActiveBattle(finalBattle);
    setMegaToggled(false);
    setZMoveToggled(false);
    setDynamaxToggled(false);
  };

  const handleExecuteTurn = async (action, moveIndex = 0, switchIndex = null, extraParams = {}) => {
    if (battleLoading) return;
    setBattleLoading(true);

    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/battle/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          moveIndex,
          switchIndex,
          megaEvolve: megaToggled,
          zMove: zMoveToggled,
          dynamax: dynamaxToggled,
          ...extraParams
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการต่อสู้');

      await playActionSequence(data.actionSequence, data.battle);
    } catch (err) {
      alert(err.message);
    } finally {
      setBattleLoading(false);
      setShowSwitchModal(false);
      setShowBagModal(false);
    }
  };

  const handleUseBagItem = (itemId, targetIndex) => {
    handleExecuteTurn('use_item', 0, null, { itemId, targetIndex });
  };

  const getHpPercent = (curr, max) => {
    return Math.max(0, Math.min(100, Math.round((curr / max) * 100)));
  };

  const getHpColor = (percent) => {
    if (percent > 50) return '#2ecc71';
    if (percent > 20) return '#f1c40f';
    return '#ff4757';
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255, 71, 87, 0.15)',
          border: '1px solid rgba(255, 71, 87, 0.4)',
          color: '#ff6b81',
          padding: '14px 18px',
          borderRadius: 12,
          marginBottom: 24
        }}>
          <AlertCircle size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={onNavigateToTeam} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            ไปจัดทีมต่อสู้
          </button>
        </div>
      )}

      {!activeBattle ? (
        /* Gym Leader Selection View */
        <div>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid rgba(243, 156, 18, 0.3)',
              color: '#f39c12',
              padding: '6px 16px',
              borderRadius: 9999,
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: 12
            }}>
              <Swords size={16} />
              <span>POKÉMON TURN-BASED ARENA</span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800 }}>สนามประลองยิมลีดเดอร์ (Gym Challenge)</h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: 650, margin: '8px auto 0', fontSize: '0.95rem' }}>
              ทดสอบความสามารถทีมของคุณ ต่อสู้แบบ Turn-based พร้อมระบบร่าง Mega, Z-Move, Dynamax และไอเท็มสวมใส่ ชนะเพื่อรับเหรียญ <b>FUKU</b> และเข็มกลัดเกียรติยศ!
            </p>
          </div>

          {/* New Player Friendly Farm Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.12) 0%, rgba(0, 210, 255, 0.08) 100%)',
            border: '1px solid rgba(46, 213, 115, 0.3)',
            borderRadius: 16,
            padding: '12px 20px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={18} style={{ color: '#2ed573' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                ผู้เล่นใหม่ต้องการฟาร์มเหรียญ FUKU เพิ่ม หรือกดรับเงินสนับสนุนประจำวัน (+3,000 FUKU)?
              </span>
            </div>
            {onNavigateToFarm && (
              <button
                onClick={onNavigateToFarm}
                className="btn btn-outline"
                style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: '#2ed573', color: '#2ed573' }}
              >
                <span>ไปที่ศูนย์ฟาร์มเหรียญ</span>
              </button>
            )}
          </div>

          {/* Gym Category Filter Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 26,
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: 'ทั้งหมด', icon: Swords },
              { id: 'kanto', label: 'ยิมคันโต 8 แห่ง (Kanto 1-8)', icon: Shield },
              { id: 'champions', label: 'จตุรเทพ & แชมเปียน (Elite Four & Champions)', icon: Crown }
            ].map(tab => {
              const TabIcon = tab.icon;
              const count = gyms.filter(g => {
                if (tab.id === 'all') return true;
                if (tab.id === 'kanto') return g.region === 'kanto' || (!g.region && ['brock','misty','ltsurge','erika','koga','sabrina','blaine','giovanni'].includes(g.id));
                if (tab.id === 'champions') return g.region === 'champions' || ['lance','cynthia','champion_red'].includes(g.id);
                return true;
              }).length;

              const active = gymFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setGymFilter(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 20px',
                    borderRadius: 9999,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                    background: active ? 'linear-gradient(135deg, rgba(235, 59, 90, 0.25) 0%, rgba(250, 130, 49, 0.25) 100%)' : 'rgba(255, 255, 255, 0.04)',
                    color: active ? '#fff' : 'var(--text-dim)',
                    boxShadow: active ? '0 0 16px rgba(235, 59, 90, 0.35)' : 'none'
                  }}
                >
                  <TabIcon size={16} style={{ color: active ? 'var(--primary)' : 'inherit' }} />
                  <span>{tab.label} ({count})</span>
                </button>
              );
            })}
          </div>

          {loadingGyms ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
              กำลังโหลดยิมลีดเดอร์...
            </div>
          ) : filteredGyms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              ไม่พบยิมในหมวดหมู่นี้
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {filteredGyms.map(gym => {
                const diffStyle = getDifficultyBadge(gym.difficulty);
                const cardStyle = getGymCardStyle(gym.difficulty);
                return (
                  <div
                    key={gym.id}
                    className="pokemon-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      padding: 24,
                      position: 'relative',
                      overflow: 'hidden',
                      ...cardStyle
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
                      <span className="badge" style={{
                        background: diffStyle.bg,
                        color: diffStyle.color,
                        border: `1px solid ${diffStyle.border}`,
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        ระดับ: {gym.difficulty}
                      </span>
                      <span className="badge" style={{ 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.75rem'
                      }}>
                        {gym.badgeImage && (
                          <img src={gym.badgeImage} alt={gym.badge} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        )}
                        <span>{gym.badge}</span>
                      </span>
                    </div>

                    <div style={{ 
                      width: 124, 
                      height: 124, 
                      marginBottom: 14, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: gym.difficulty?.includes('Legendary')
                        ? 'radial-gradient(circle, rgba(255, 71, 87, 0.25) 0%, transparent 70%)'
                        : gym.difficulty?.includes('Master')
                        ? 'radial-gradient(circle, rgba(155, 81, 224, 0.25) 0%, transparent 70%)'
                        : gym.difficulty?.includes('Expert')
                        ? 'radial-gradient(circle, rgba(241, 196, 15, 0.2) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(0, 210, 255, 0.15) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}>
                      <img 
                        src={gym.avatar} 
                        alt={gym.name}
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))' }}
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = 'https://play.pokemonshowdown.com/sprites/trainers/red.png';
                        }}
                      />
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8, minHeight: '2.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {gym.name}
                    </h3>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0 14px 0', flexWrap: 'wrap' }}>
                      {gym.pokemonPreview.map((p, idx) => (
                        <div key={idx} title={p.name} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 8,
                          padding: '4px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                          <img src={p.sprite} alt={p.name} style={{ width: 36, height: 36 }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {gym.hint && (
                      <div style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        color: '#00d2ff',
                        background: 'rgba(0, 210, 255, 0.08)',
                        border: '1px solid rgba(0, 210, 255, 0.25)',
                        padding: '8px 10px',
                        borderRadius: 10,
                        marginBottom: 12,
                        lineHeight: 1.4,
                        textAlign: 'left'
                      }}>
                        <b>คำแนะนำ:</b> {gym.hint}
                      </div>
                    )}

                    <div style={{
                      marginTop: 'auto',
                      width: '100%',
                      background: 'rgba(243, 156, 18, 0.1)',
                      border: '1px solid rgba(243, 156, 18, 0.25)',
                      padding: '8px 12px',
                      borderRadius: 10,
                      marginBottom: 16,
                      fontSize: '0.85rem',
                      color: '#f39c12',
                      fontWeight: 700
                    }}>
                      รางวัลชนะ: +{gym.reward.toLocaleString()} FUKU
                    </div>

                    <button
                      onClick={() => handleStartBattle(gym.id)}
                      disabled={battleLoading}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      <Swords size={18} />
                      <span>ท้าดวลประลอง</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Active Turn-Based Battle Arena */
        <div style={{
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(14, 20, 36, 0.95) 0%, rgba(9, 12, 21, 0.98) 100%)',
          border: '1px solid var(--border-glass)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden'
        }}>
          {/* Action Overlay for Visual FX and Damage Popups */}
          <BattleActionOverlay activeEffect={actionEffect} floatingPopups={floatingPopups} />

          {/* Arena Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.2)', color: '#00d2ff', fontSize: '0.8rem', padding: '4px 12px' }}>
                เทิร์นที่ {activeBattle.turn}
              </span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{activeBattle.gymName}</h2>
            </div>

            <button 
              onClick={() => setActiveBattle(null)}
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              <RotateCcw size={14} />
              <span>ยอมแพ้ / ออกจากการต่อสู้</span>
            </button>
          </div>

          {/* Arena Field */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 24,
            marginBottom: 20
          }}>
            {/* 1. Opponent Active Mon (Top Right) */}
            {(() => {
              const oppMon = activeBattle.opponentTeam[activeBattle.opponentActiveIndex];
              const hpPct = getHpPercent(oppMon.hp, oppMon.maxHp);
              return (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  padding: '16px 24px',
                  borderRadius: 16
                }}>
                  {/* Opponent Info & HP */}
                  <div style={{ flex: '0 1 340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{oppMon.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      {oppMon.types.map(t => (
                        <span key={t} className="badge" style={{ background: TYPE_COLORS[t]?.bg || '#444', color: '#fff', fontSize: '0.65rem' }}>
                          {t}
                        </span>
                      ))}
                      {oppMon.held_item_name && (
                        <span className="badge" style={{ background: 'rgba(241, 196, 12, 0.2)', color: '#f1c40f', fontSize: '0.65rem' }}>
                          {oppMon.held_item_name}
                        </span>
                      )}
                    </div>

                    <div className="hp-bar-track">
                      <div 
                        className="hp-bar-fill" 
                        style={{ width: `${hpPct}%`, backgroundColor: getHpColor(hpPct) }} 
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      HP: {oppMon.hp} / {oppMon.maxHp} ({hpPct}%)
                    </div>

                    {/* Squad Pokeballs */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {activeBattle.opponentTeam.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: p.hp <= 0 ? 'rgba(255, 255, 255, 0.15)' : '#e74c3c',
                            border: '1px solid rgba(255, 255, 255, 0.4)'
                          }}
                          title={`${p.name}: ${p.hp > 0 ? 'พร้อมสู้' : 'หมดสติ'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Opponent Sprite */}
                  <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={oppMon.artwork || oppMon.sprite} 
                      alt={oppMon.name} 
                      className={`floating-pokemon ${oppAttacking ? 'anim-lunge-opp' : ''} ${oppHit ? 'anim-hit-shake' : ''}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* 2. User Active Mon (Bottom Left) */}
            {(() => {
              const userMon = activeBattle.userTeam[activeBattle.userActiveIndex];
              const hpPct = getHpPercent(userMon.hp, userMon.maxHp);
              return (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 210, 255, 0.04)',
                  border: userMon.isMega ? '1px solid #9b51e0' : userMon.isDynamax ? '1px solid #ff4757' : '1px solid rgba(0, 210, 255, 0.3)',
                  padding: '16px 24px',
                  borderRadius: 16
                }}>
                  {/* User Sprite */}
                  <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={userMon.artwork || userMon.sprite} 
                      alt={userMon.nickname} 
                      className={`floating-pokemon ${userAttacking ? 'anim-lunge-user' : ''} ${userHit ? 'anim-hit-shake' : ''} ${userMon.isMega ? 'mega-glow' : ''} ${userMon.isDynamax ? 'dynamax-aura' : ''} ${zMoveToggled ? 'z-aura' : ''}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  {/* User Info & HP */}
                  <div style={{ flex: '0 1 340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {userMon.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {userMon.types.map(t => (
                        <span key={t} className="badge" style={{ background: TYPE_COLORS[t]?.bg || '#444', color: '#fff', fontSize: '0.65rem' }}>
                          {t}
                        </span>
                      ))}
                      {userMon.held_item_name && (
                        <span className="badge" style={{ background: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', fontSize: '0.65rem' }}>
                          {userMon.held_item_name}
                        </span>
                      )}
                      {userMon.isMega && (
                        <span className="badge" style={{ background: 'rgba(155, 81, 224, 0.25)', color: '#9b51e0', fontSize: '0.65rem' }}>
                          MEGA
                        </span>
                      )}
                      {userMon.isDynamax && (
                        <span className="badge" style={{ background: 'rgba(255, 71, 87, 0.25)', color: '#ff4757', fontSize: '0.65rem' }}>
                          DYNAMAX ({userMon.dynamaxTurns}t)
                        </span>
                      )}
                    </div>

                    <div className="hp-bar-track">
                      <div 
                        className="hp-bar-fill" 
                        style={{ width: `${hpPct}%`, backgroundColor: getHpColor(hpPct) }} 
                      />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      HP: <b style={{ color: '#fff' }}>{userMon.hp}</b> / {userMon.maxHp} ({hpPct}%)
                    </div>

                    {/* Squad Pokeballs */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {activeBattle.userTeam.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: p.hp <= 0 ? 'rgba(255, 255, 255, 0.15)' : '#00d2ff',
                            border: '1px solid rgba(255, 255, 255, 0.4)'
                          }}
                          title={`${p.nickname}: ${p.hp > 0 ? 'พร้อมสู้' : 'หมดสติ'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Battle Log Box */}
          <div 
            ref={logContainerRef}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: 14,
              padding: '12px 16px',
              height: 130,
              overflowY: 'auto',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {(activeBattle.logs || []).map((line, idx) => {
              const isSuper = line.includes('ยอดเยี่ยม') || line.includes('Super effective') || line.includes('Z-POWER');
              const isCrit = line.includes('คริติคอล');
              const isFaint = line.includes('หมดสติ');
              const isVictory = line.includes('เอาชนะ');
              const isGimmick = line.includes('MEGA') || line.includes('DYNAMAX');

              return (
                <div 
                  key={idx} 
                  style={{ 
                    fontSize: '0.85rem',
                    color: isVictory ? '#f39c12' : isGimmick ? '#9b51e0' : isSuper ? '#00d2ff' : isCrit ? '#ff4757' : isFaint ? '#e74c3c' : 'var(--text-muted)',
                    fontWeight: (isVictory || isSuper || isCrit || isFaint || isGimmick) ? 700 : 400
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Action Panel / Victory / Defeat */}
          {activeBattle.status === 'VICTORY' ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid rgba(243, 156, 18, 0.4)',
              borderRadius: 16
            }}>
              <Trophy size={48} style={{ color: '#f39c12', marginBottom: 12 }} />
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f39c12' }}>ชัยชนะอันยิ่งใหญ่!</h2>
              <p style={{ color: 'var(--text-main)', margin: '8px 0 16px' }}>
                คุณได้รับเข็มกลัด <b>{activeBattle.badge}</b> และรางวัล <b>+{activeBattle.reward.toLocaleString()} FUKU</b>!
              </p>
              <button onClick={() => setActiveBattle(null)} className="btn btn-primary" style={{ padding: '10px 28px' }}>
                กลับสู่หน้ายิมลีดเดอร์
              </button>
            </div>
          ) : activeBattle.status === 'DEFEAT' ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: 'rgba(255, 71, 87, 0.15)',
              border: '1px solid rgba(255, 71, 87, 0.4)',
              borderRadius: 16
            }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff4757' }}>ทีมของคุณพ่ายแพ้...</h2>
              <p style={{ color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                อย่าเพิ่งยอมแพ้! ลองปรับแต่งสกิล สวมใส่ไอเท็ม หรือเปิดใช้ร่าง Mega / Dynamax ในการประลองครั้งหน้า
              </p>
              <button onClick={() => setActiveBattle(null)} className="btn btn-outline" style={{ padding: '10px 28px' }}>
                กลับสู่หน้ายิมลีดเดอร์
              </button>
            </div>
          ) : (
            /* Moves & Special Battle Controls */
            (() => {
              const activeUserMon = activeBattle.userTeam[activeBattle.userActiveIndex];
              const megaCheck = checkMegaEvolution(activeUserMon);
              const zMoveCheck = checkZMove(activeUserMon);
              const isMegaDisabled = activeBattle.userMegaUsed || activeUserMon.isMega || !megaCheck.canMega || battleLoading;
              const isZMoveDisabled = activeBattle.userZMoveUsed || !zMoveCheck.canZMove || battleLoading;
              const isDynamaxDisabled = activeBattle.userDynamaxUsed || activeUserMon.isDynamax || battleLoading;

              return (
                <div>
                  {/* Gimmick Toggles & Actions Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 14
                  }}>
                    {/* Special Gimmick Buttons (Mega, Z-Move, Dynamax) */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Mega Evolution */}
                      <button
                        onClick={() => {
                          if (!megaCheck.canMega) return;
                          setMegaToggled(!megaToggled);
                          setZMoveToggled(false);
                          setDynamaxToggled(false);
                        }}
                        disabled={isMegaDisabled}
                        title={!megaCheck.canMega ? megaCheck.reason : activeBattle.userMegaUsed ? 'ใช้ Mega Evolution ไปแล้วในแมตช์นี้' : megaToggled ? 'ยกเลิกการแปลงร่าง Mega' : 'กดเพื่อแปลงร่าง Mega ในเทิร์นนี้'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: megaToggled ? 'linear-gradient(135deg, #ff007f 0%, #9b51e0 100%)' : 'rgba(155, 81, 224, 0.12)',
                          border: megaToggled ? '1px solid #fff' : '1px solid rgba(155, 81, 224, 0.4)',
                          color: megaToggled ? '#fff' : '#9b51e0',
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: isMegaDisabled ? 'not-allowed' : 'pointer',
                          opacity: isMegaDisabled ? 0.4 : 1,
                          boxShadow: megaToggled ? '0 0 15px rgba(155, 81, 224, 0.6)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Sparkles size={14} />
                        <span>{activeBattle.userMegaUsed ? 'MEGA ใช้แล้ว' : megaToggled ? 'MEGA: พร้อมปลดปล่อย' : 'MEGA EVOLVE'}</span>
                      </button>

                      {/* Z-Move */}
                      <button
                        onClick={() => {
                          if (!zMoveCheck.canZMove) return;
                          setZMoveToggled(!zMoveToggled);
                          setMegaToggled(false);
                          setDynamaxToggled(false);
                        }}
                        disabled={isZMoveDisabled}
                        title={!zMoveCheck.canZMove ? zMoveCheck.reason : activeBattle.userZMoveUsed ? 'ใช้ Z-Move ไปแล้วในแมตช์นี้' : zMoveToggled ? 'ยกเลิก Z-Move' : 'กดเพื่อชาร์จ Z-Move ในเทิร์นนี้'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: zMoveToggled ? 'linear-gradient(135deg, #f39c12 0%, #e74c3c 100%)' : 'rgba(243, 156, 18, 0.12)',
                          border: zMoveToggled ? '1px solid #fff' : '1px solid rgba(243, 156, 18, 0.4)',
                          color: zMoveToggled ? '#fff' : '#f39c12',
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: isZMoveDisabled ? 'not-allowed' : 'pointer',
                          opacity: isZMoveDisabled ? 0.4 : 1,
                          boxShadow: zMoveToggled ? '0 0 15px rgba(243, 156, 18, 0.6)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Zap size={14} />
                        <span>{activeBattle.userZMoveUsed ? 'Z-MOVE ใช้แล้ว' : zMoveToggled ? 'Z-MOVE: ชาร์จพลัง' : 'Z-MOVE'}</span>
                      </button>

                      {/* Dynamax */}
                      <button
                        onClick={() => {
                          setDynamaxToggled(!dynamaxToggled);
                          setMegaToggled(false);
                          setZMoveToggled(false);
                        }}
                        disabled={isDynamaxDisabled}
                        title={isDynamaxDisabled ? 'ไม่สามารถใช้ Dynamax ได้' : dynamaxToggled ? 'ยกเลิกขยายร่าง Dynamax' : 'กดเพื่อขยายร่าง Dynamax ในเทิร์นนี้'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: dynamaxToggled ? 'linear-gradient(135deg, #ff4757 0%, #c0392b 100%)' : 'rgba(255, 71, 87, 0.12)',
                          border: dynamaxToggled ? '1px solid #fff' : '1px solid rgba(255, 71, 87, 0.4)',
                          color: dynamaxToggled ? '#fff' : '#ff4757',
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: isDynamaxDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDynamaxDisabled ? 0.4 : 1,
                          boxShadow: dynamaxToggled ? '0 0 15px rgba(255, 71, 87, 0.6)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Flame size={14} />
                        <span>{activeBattle.userDynamaxUsed ? 'DYNAMAX ใช้แล้ว' : dynamaxToggled ? 'DYNAMAX: ขยายร่าง' : 'DYNAMAX'}</span>
                      </button>
                    </div>

                    {/* Switch & Bag Buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setShowBagModal(true)}
                        disabled={battleLoading}
                        className="btn btn-outline"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: '#2ed573', color: '#2ed573' }}
                      >
                        <ShoppingBag size={14} />
                        <span>ใช้ไอเท็ม (BAG)</span>
                      </button>

                      <button
                        onClick={() => setShowSwitchModal(true)}
                        disabled={battleLoading}
                        className="btn btn-outline"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        <Shield size={14} />
                        <span>สลับตัว</span>
                      </button>
                    </div>
                  </div>

                  {/* Move Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {activeUserMon.moves.map((move, idx) => {
                      const conf = TYPE_COLORS[move.type?.toLowerCase()] || { bg: '#444', text: '#fff' };
                      const isSpecialMode = zMoveToggled || dynamaxToggled;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleExecuteTurn('attack', idx)}
                          disabled={battleLoading}
                          style={{
                            background: isSpecialMode 
                              ? zMoveToggled ? 'rgba(243, 156, 18, 0.12)' : 'rgba(255, 71, 87, 0.12)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: isSpecialMode
                              ? zMoveToggled ? '1px solid #f39c12' : '1px solid #ff4757'
                              : `1px solid ${conf.bg}66`,
                            borderRadius: 12,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 4,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 15px ${conf.bg}44`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                              {zMoveToggled ? `Z: ${move.name}` : dynamaxToggled ? `MAX: ${move.name}` : move.name}
                            </span>
                            <span className="badge" style={{ background: conf.bg, color: conf.text, fontSize: '0.65rem' }}>
                              {move.type}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            พลัง: <b>{zMoveToggled ? 200 : dynamaxToggled ? 140 : (move.power || 60)}</b> | ความแม่นยำ: {zMoveToggled || dynamaxToggled ? '100%' : `${move.accuracy || 100}%`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}

          {/* Switch Pokemon Modal */}
          {showSwitchModal && (
            <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>
                  เลือกโปเกมอนที่ต้องการส่งลงสนาม
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeBattle.userTeam.map((p, idx) => {
                    const isCurrent = idx === activeBattle.userActiveIndex;
                    const isFainted = p.hp <= 0;
                    return (
                      <button
                        key={idx}
                        disabled={isCurrent || isFainted || battleLoading}
                        onClick={() => handleExecuteTurn('switch', 0, idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          background: isCurrent ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          border: isCurrent ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                          padding: 12,
                          borderRadius: 10,
                          cursor: (isCurrent || isFainted) ? 'not-allowed' : 'pointer',
                          opacity: isFainted ? 0.4 : 1,
                          color: '#fff',
                          textAlign: 'left'
                        }}
                      >
                        <img src={p.sprite} alt={p.nickname} style={{ width: 40, height: 40 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{p.nickname}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            HP: {p.hp} / {p.maxHp} {isFainted && '(หมดสติ)'} {isCurrent && '(กำลังต่อสู้อยู่)'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* In-Battle Bag Modal */}
          <InBattleBagModal
            isOpen={showBagModal}
            onClose={() => setShowBagModal(false)}
            onUseItem={handleUseBagItem}
            userTeam={activeBattle.userTeam}
            activeIndex={activeBattle.userActiveIndex}
          />
        </div>
      )}
    </div>
  );
}

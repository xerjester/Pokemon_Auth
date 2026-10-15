import React, { useState, useEffect, useRef } from 'react';
import { Swords, Trophy, Shield, Coins, ArrowRight, RotateCcw, AlertCircle, Sparkles, User, Zap, Flame, ShoppingBag, X, Search, CheckCircle2, Clock } from 'lucide-react';
import { TYPE_COLORS } from '../utils/typeColors';
import { battleAudio } from '../utils/battleAudio';
import BattleActionOverlay from '../components/BattleActionOverlay';
import InBattleBagModal from '../components/InBattleBagModal';
import confetti from 'canvas-confetti';
import { checkMegaEvolution, checkZMove } from '../utils/gimmickValidation';

export default function PvpPage({ user, onRefreshUser, onNavigateToTeam, incomingRoomId, onClearIncomingRoom }) {
  const [opponents, setOpponents] = useState([]);
  const [loadingLobby, setLoadingLobby] = useState(true);
  const [activeBattle, setActiveBattle] = useState(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showBagModal, setShowBagModal] = useState(false);
  const [customWagers, setCustomWagers] = useState({});

  // Challenge States
  const [outgoingChallenge, setOutgoingChallenge] = useState(null);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState(null);
  const [targetCooldowns, setTargetCooldowns] = useState({}); // { [targetUsernameOrId]: seconds }

  // Filter & Search States
  const [lobbyFilter, setLobbyFilter] = useState('all'); // 'all' | 'real' | 'bots'
  const [searchQuery, setSearchQuery] = useState('');

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

  const logRef = useRef(null);

  useEffect(() => {
    fetchLobby();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activeBattle?.logs]);

  // 1. Fetch Lobby
  const fetchLobby = async () => {
    setLoadingLobby(true);
    try {
      const res = await fetch('/api/pvp/lobby');
      const data = await res.json();
      setOpponents(data.opponents || []);
    } catch (err) {
      console.error('Error loading PvP lobby:', err);
    } finally {
      setLoadingLobby(false);
    }
  };

  // 2. Fetch active challenge cooldown status per target (คนต่อคน)
  const fetchCooldown = async () => {
    try {
      const token = localStorage.getItem('pokemon_token');
      if (!token) return;
      const res = await fetch('/api/pvp/challenge-cooldown', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cooldowns) {
          setTargetCooldowns(data.cooldowns);
        }
      }
    } catch (err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchCooldown();
  }, [user]);

  // 1-second interval to tick down cooldown timer for each target player
  useEffect(() => {
    const hasActiveCooldowns = Object.values(targetCooldowns).some(s => s > 0);
    if (!hasActiveCooldowns) return;

    const timer = setInterval(() => {
      setTargetCooldowns(prev => {
        const next = {};
        let changed = false;
        for (const [key, val] of Object.entries(prev)) {
          if (val > 1) {
            next[key] = val - 1;
            changed = true;
          } else if (val === 1) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetCooldowns]);

  // Handle incomingRoomId when accepted from global modal
  useEffect(() => {
    if (incomingRoomId) {
      setMultiplayerRoomId(incomingRoomId);
      const token = localStorage.getItem('pokemon_token');
      fetch(`/api/pvp/room/${incomingRoomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(roomData => {
          setActiveBattle(roomData);
          if (onClearIncomingRoom) onClearIncomingRoom();
          if (onRefreshUser) onRefreshUser();
        })
        .catch(err => {
          console.error('Error joining incoming room:', err);
          if (onClearIncomingRoom) onClearIncomingRoom();
        });
    }
  }, [incomingRoomId]);

  // 3. Poll outgoing challenge status (waiting for acceptance/decline)
  useEffect(() => {
    if (!outgoingChallenge || outgoingChallenge.status !== 'PENDING') return;

    const pollOutgoing = async () => {
      try {
        const token = localStorage.getItem('pokemon_token');
        if (!token) return;
        const res = await fetch(`/api/pvp/challenges/${outgoingChallenge.id}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'ACCEPTED') {
          // Challenge was accepted! Enter the match room
          setOutgoingChallenge(null);
          setMultiplayerRoomId(data.roomId);
          const roomRes = await fetch(`/api/pvp/room/${data.roomId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const roomData = await roomRes.json();
          setActiveBattle(roomData);
          if (onRefreshUser) onRefreshUser();
        } else if (data.status === 'DECLINED') {
          alert(`@${outgoingChallenge.targetUsername} ได้ปฏิเสธคำท้าประลอง`);
          setOutgoingChallenge(null);
        } else if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          setOutgoingChallenge(null);
        }
      } catch (err) {
        console.error('Outgoing poll error:', err);
      }
    };

    const interval = setInterval(pollOutgoing, 1500);
    return () => clearInterval(interval);
  }, [outgoingChallenge]);

  // 4. Poll active multiplayer battle room
  useEffect(() => {
    if (!multiplayerRoomId || !activeBattle || activeBattle.status === 'FINISHED') return;

    const pollRoom = async () => {
      try {
        const token = localStorage.getItem('pokemon_token');
        if (!token) return;
        const res = await fetch(`/api/pvp/room/${multiplayerRoomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        // If turn has advanced or room finished
        if (data.turn > activeBattle.turn || (data.status === 'FINISHED' && activeBattle.status !== 'FINISHED')) {
          await playActionSequence(data.actionSequence, data);
        } else {
          setActiveBattle(prev => ({
            ...prev,
            ...data
          }));
        }
      } catch (err) {
        console.error('Room polling error:', err);
      }
    };

    const interval = setInterval(pollRoom, 1200);
    return () => clearInterval(interval);
  }, [multiplayerRoomId, activeBattle?.turn, activeBattle?.status]);

  // Challenge a trainer (Real Player or Bot)
  const handleChallenge = async (targetUsername, defaultWager) => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบก่อนเข้าสู่สนาม PvP');
      return;
    }

    const wager = customWagers[targetUsername] || defaultWager || 1000;
    if (parseFloat(user.fuku_balance || 0) < wager) {
      setError(`เหรียญ FUKU ของคุณไม่เพียงพอสำหรับการเดิมพัน ${wager.toLocaleString()} FUKU (มี ${parseFloat(user.fuku_balance).toLocaleString()} FUKU)`);
      return;
    }

    setBattleLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/pvp/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opponentUsername: targetUsername,
          wager
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.remainingSeconds) {
          const targetKey = targetUsername.toLowerCase();
          setTargetCooldowns(prev => ({
            ...prev,
            [targetKey]: data.remainingSeconds,
            ...(data.targetId ? { [data.targetId]: data.remainingSeconds } : {})
          }));
        }
        throw new Error(data.error || 'ไม่สามารถท้าประลองได้');
      }

      if (data.isRealPlayer) {
        // Wait for real player to accept/decline
        setOutgoingChallenge(data.challenge);
        const targetKey = targetUsername.toLowerCase();
        setTargetCooldowns(prev => ({
          ...prev,
          [targetKey]: 60,
          ...(data.targetId ? { [data.targetId]: 60 } : {})
        }));
      } else {
        // Immediate bot match
        setActiveBattle(data.battle);
        setMultiplayerRoomId(null);
        setMegaToggled(false);
        setZMoveToggled(false);
        setDynamaxToggled(false);
        if (onRefreshUser) onRefreshUser();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBattleLoading(false);
    }
  };

  // Accept incoming challenge
  const handleAcceptChallenge = async (challengeId) => {
    try {
      setBattleLoading(true);
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch(`/api/pvp/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถตอบรับคำท้าได้');

      setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
      setMultiplayerRoomId(data.roomId);

      const roomRes = await fetch(`/api/pvp/room/${data.roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomRes.json();
      setActiveBattle(roomData);
      if (onRefreshUser) onRefreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setBattleLoading(false);
    }
  };

  // Decline incoming challenge
  const handleDeclineChallenge = async (challengeId) => {
    try {
      const token = localStorage.getItem('pokemon_token');
      await fetch(`/api/pvp/challenges/${challengeId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIncomingChallenges(prev => prev.filter(c => c.id !== challengeId));
    } catch (err) {
      console.error('Decline error:', err);
    }
  };

  // Cancel outgoing challenge
  const handleCancelOutgoingChallenge = async () => {
    if (!outgoingChallenge) return;
    try {
      const token = localStorage.getItem('pokemon_token');
      await fetch(`/api/pvp/challenges/${outgoingChallenge.id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setOutgoingChallenge(null);
    } catch (err) {
      console.error('Cancel challenge error:', err);
      setOutgoingChallenge(null);
    }
  };

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

      // Multiplayer Room action
      if (multiplayerRoomId) {
        const res = await fetch(`/api/pvp/room/${multiplayerRoomId}/action`, {
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
        if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งคำสั่ง');

        if (data.turnResolved) {
          const roomRes = await fetch(`/api/pvp/room/${multiplayerRoomId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const roomData = await roomRes.json();
          await playActionSequence(data.actionSequence, roomData);
        } else {
          setActiveBattle(prev => ({ ...prev, waitingForOpponent: true, hasActed: true }));
        }
      } else {
        // Single-player bot match
        const res = await fetch('/api/pvp/action', {
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
        if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการต่อสู้ PvP');

        await playActionSequence(data.actionSequence, data.battle);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBattleLoading(false);
      setShowSwitchModal(false);
      setShowBagModal(false);
    }
  };

  const handleSurrender = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการขอยอมแพ้การแข่งขัน? (จะเสียเงินเดิมพัน)')) return;

    if (multiplayerRoomId) {
      try {
        const token = localStorage.getItem('pokemon_token');
        await fetch(`/api/pvp/room/${multiplayerRoomId}/surrender`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const res = await fetch(`/api/pvp/room/${multiplayerRoomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setActiveBattle(data);
      } catch (err) {
        console.error('Surrender error:', err);
      }
    } else {
      setActiveBattle(null);
    }
  };

  const handleUseBagItem = (itemId, targetIndex) => {
    handleExecuteTurn('use_item', 0, null, { itemId, targetIndex });
  };

  const getHpPercent = (curr, max) => Math.max(0, Math.min(100, Math.round((curr / max) * 100)));
  const getHpColor = (percent) => (percent > 50 ? '#2ecc71' : percent > 20 ? '#f1c40f' : '#ff4757');

  // Filter opponents
  const filteredOpponents = opponents.filter(opp => {
    // Hide self from opponent list
    if (user && opp.username?.toLowerCase() === user.username?.toLowerCase()) return false;

    if (lobbyFilter === 'real' && !opp.isRealPlayer) return false;
    if (lobbyFilter === 'bots' && opp.isRealPlayer) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = opp.name?.toLowerCase().includes(q);
      const matchUser = opp.username?.toLowerCase().includes(q);
      return matchName || matchUser;
    }

    return true;
  });

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


      {/* ======================================================== */}
      {/* OUTGOING CHALLENGE MODAL (WAITING / CANCEL FOR CHALLENGER) */}
      {/* ======================================================== */}
      {outgoingChallenge && !activeBattle && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #181329 0%, #0d1020 100%)',
            border: '1px solid rgba(155, 81, 224, 0.5)',
            borderRadius: 24,
            padding: '36px 30px',
            maxWidth: 460,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 0 35px rgba(155, 81, 224, 0.3)'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '3px solid #9b51e0',
              borderTopColor: 'transparent',
              margin: '0 auto 20px',
              animation: 'spin 1.2s linear infinite'
            }} />

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>
              กำลังรอการตอบรับจาก @{outgoingChallenge.targetUsername}...
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
              ส่งคำท้าดวลสำเร็จแล้ว รอคู่ต่อสู้กดตอบรับเข้าสู่สังเวียน<br />
              เดิมพัน: <b style={{ color: '#f39c12' }}>{outgoingChallenge.wager.toLocaleString()} FUKU</b> | ชนะรับ: <b>{(outgoingChallenge.wager * 2).toLocaleString()} FUKU</b>
            </p>

            <button
              onClick={handleCancelOutgoingChallenge}
              className="btn btn-outline"
              style={{
                width: '100%',
                borderColor: '#ff4757',
                color: '#ff4757',
                padding: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <RotateCcw size={16} />
              <span>กดยกเลิกคำท้า (Cancel Challenge)</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN VIEW: LOBBY OR ACTIVE BATTLE */}
      {/* ======================================================== */}
      {!activeBattle ? (
        /* PvP Lobby */
        <div>
          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.9) 0%, rgba(14, 18, 35, 0.95) 100%)',
            border: '1px solid rgba(155, 81, 224, 0.4)',
            borderRadius: 20,
            padding: '30px 36px',
            marginBottom: 28,
            boxShadow: '0 10px 30px rgba(155, 81, 224, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(155, 81, 224, 0.2)',
                border: '1px solid rgba(155, 81, 224, 0.4)',
                color: '#bb86fc',
                padding: '4px 14px',
                borderRadius: 9999,
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: 10
              }}>
                <Trophy size={14} />
                <span>3v3 POKÉMON WAGER ARENA</span>
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0' }}>
                สังเวียนประลองผู้เล่น (PvP Arena)
              </h1>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', maxWidth: 620 }}>
                ท้าดวลผู้เล่นจริงหรือเทรนเนอร์จำลอง วางเดิมพันเหรียญ <b>FUKU</b> ตอบรับคำท้าแล้วประลองฝีมือ ผู้ชนะรับเงินรางวัลกองกลางทั้งหมด!
              </p>
            </div>

            <button
              onClick={() => {
                if (filteredOpponents.length > 0) {
                  const randomOpp = filteredOpponents[Math.floor(Math.random() * filteredOpponents.length)];
                  handleChallenge(randomOpp.username, randomOpp.defaultWager);
                }
              }}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #9b51e0 0%, #e056fd 100%)',
                border: 'none',
                padding: '14px 28px',
                fontSize: '1rem',
                boxShadow: '0 6px 20px rgba(155, 81, 224, 0.5)'
              }}
            >
              <Swords size={20} />
              <span>สุ่มจับคู่ด่วน (Quick Match)</span>
            </button>
          </div>

          {/* Lobby Search & Category Filters Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 14
          }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `ทั้งหมด (${opponents.filter(o => !user || o.username?.toLowerCase() !== user.username?.toLowerCase()).length})` },
                { id: 'real', label: `ผู้เล่นจริง (${opponents.filter(o => o.isRealPlayer && (!user || o.username?.toLowerCase() !== user.username?.toLowerCase())).length})` },
                { id: 'bots', label: `เทรนเนอร์จำลอง (${opponents.filter(o => !o.isRealPlayer).length})` }
              ].map(tab => {
                const active = lobbyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setLobbyFilter(tab.id)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 9999,
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: active ? '1px solid #9b51e0' : '1px solid var(--border-glass)',
                      background: active ? 'rgba(155, 81, 224, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: active ? '#fff' : 'var(--text-dim)',
                      boxShadow: active ? '0 0 14px rgba(155, 81, 224, 0.3)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 260 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผู้เล่น หรือ Username..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Trainer Cards Grid */}
          {loadingLobby ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              กำลังโหลดรายชื่อผู้เล่นในสังเวียน...
            </div>
          ) : filteredOpponents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              ไม่พบผู้เล่นในหมวดหมู่นี้
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filteredOpponents.map(opp => (
                <div
                  key={opp.id}
                  className="pokemon-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 22,
                    border: opp.isRealPlayer ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid rgba(155, 81, 224, 0.3)',
                    background: opp.isRealPlayer 
                      ? 'linear-gradient(180deg, rgba(46, 204, 113, 0.05) 0%, rgba(18, 24, 30, 0.8) 100%)'
                      : 'rgba(20, 18, 35, 0.7)',
                    boxShadow: opp.isRealPlayer ? '0 0 20px rgba(46, 204, 113, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="live-indicator-dot" />
                      <span className="badge" style={{
                        background: opp.isRealPlayer ? 'rgba(46, 204, 113, 0.2)' : 'rgba(155, 81, 224, 0.2)',
                        color: opp.isRealPlayer ? '#2ecc71' : '#bb86fc',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {opp.isRealPlayer ? 'ผู้เล่นจริง' : 'เทรนเนอร์จำลอง'}
                      </span>
                    </div>
                    <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.15)', color: '#00d2ff', fontSize: '0.75rem' }}>
                      MMR {opp.mmr}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: opp.isRealPlayer 
                        ? 'radial-gradient(circle, rgba(46, 204, 113, 0.25) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(155, 81, 224, 0.25) 0%, transparent 70%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: opp.isRealPlayer ? '1px solid rgba(46, 204, 113, 0.4)' : '1px solid rgba(155, 81, 224, 0.3)'
                    }}>
                      <img src={opp.avatar} alt={opp.name} style={{ width: 56, height: 56, objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>{opp.name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>@{opp.username}</div>
                    </div>
                  </div>

                  {/* Team Preview */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>ทีมต่อสู้ 3v3:</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(opp.team || opp.teamPreview || []).map((p, idx) => (
                        <div
                          key={idx}
                          title={p.name}
                          style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 10,
                            padding: '6px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <img src={p.sprite} alt={p.name} style={{ width: 36, height: 36 }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-main)', fontWeight: 600 }}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wager Selection & Challenge Button */}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>เงินเดิมพัน (Wager):</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[500, 1000, 2000].map(amt => {
                          const currentWager = customWagers[opp.username] || opp.defaultWager || opp.wager || 1000;
                          return (
                            <button
                              key={amt}
                              onClick={() => setCustomWagers(prev => ({ ...prev, [opp.username]: amt }))}
                              style={{
                                background: currentWager === amt ? '#f39c12' : 'rgba(255, 255, 255, 0.05)',
                                color: currentWager === amt ? '#000' : 'var(--text-main)',
                                border: 'none',
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {amt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      const oppCd = targetCooldowns[opp.username?.toLowerCase()] || targetCooldowns[opp.id] || 0;
                      const isOppOnCd = opp.isRealPlayer && oppCd > 0;
                      return (
                        <button
                          onClick={() => handleChallenge(opp.username, opp.defaultWager || opp.wager || 1000)}
                          disabled={battleLoading || isOppOnCd}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            background: isOppOnCd
                              ? 'rgba(255, 255, 255, 0.08)'
                              : opp.isRealPlayer 
                                ? 'linear-gradient(135deg, #2ed573 0%, #10ac84 100%)'
                                : 'linear-gradient(135deg, #9b51e0 0%, #70a1ff 100%)',
                            border: isOppOnCd ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                            color: isOppOnCd ? 'var(--text-dim)' : '#fff',
                            fontWeight: 800,
                            cursor: isOppOnCd ? 'not-allowed' : 'pointer'
                          }}
                          title={isOppOnCd ? `คูลดาวน์ 1 นาทีสำหรับ @${opp.username} เพื่อป้องกันการสแปมคำท้า` : ''}
                        >
                          {isOppOnCd ? (
                            <>
                              <Clock size={16} />
                              <span>รอคูลดาวน์อีก {oppCd}s (กันสแปม)</span>
                            </>
                          ) : (
                            <>
                              <Swords size={16} />
                              <span>
                                {opp.isRealPlayer ? 'ส่งคำท้าดวล' : 'ท้าดวล'} (เดิมพัน {(customWagers[opp.username] || opp.defaultWager || opp.wager || 1000).toLocaleString()} FUKU)
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })()}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Active 3v3 PvP Combat View */
        <div style={{
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(18, 14, 30, 0.95) 0%, rgba(9, 12, 21, 0.98) 100%)',
          border: '1px solid rgba(155, 81, 224, 0.4)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden'
        }}>
          {/* Action Overlay for Visual FX and Damage Popups */}
          <BattleActionOverlay activeEffect={actionEffect} floatingPopups={floatingPopups} />

          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge" style={{ background: 'rgba(155, 81, 224, 0.25)', color: '#bb86fc', fontSize: '0.8rem', padding: '4px 12px' }}>
                เทิร์นที่ {activeBattle.turn}
              </span>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{user?.username}</span>
                <span style={{ color: '#ff4757' }}>VS</span>
                <span>{activeBattle.opponentName || activeBattle.opponentUsername}</span>
                {activeBattle.isMultiplayer && (
                  <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', fontSize: '0.7rem' }}>
                    มัลติเพลเยอร์เรียลไทม์
                  </span>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid rgba(243, 156, 18, 0.4)',
              color: '#f39c12',
              padding: '6px 14px',
              borderRadius: 9999,
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>
              <Trophy size={16} />
              <span>เงินเดิมพันกองกลาง: {activeBattle.prizePool.toLocaleString()} FUKU</span>
            </div>

            <button
              onClick={handleSurrender}
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'rgba(255, 71, 87, 0.4)', color: '#ff4757' }}
            >
              <RotateCcw size={14} />
              <span>ยอมแพ้ (Surrender)</span>
            </button>
          </div>

          {/* Multiplayer Real-time Turn Status Banners */}
          {activeBattle.isMultiplayer && activeBattle.status !== 'FINISHED' && (
            <div>
              {activeBattle.waitingForOpponent ? (
                <div style={{
                  background: 'rgba(0, 210, 255, 0.12)',
                  border: '1px solid rgba(0, 210, 255, 0.35)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#00d2ff',
                  fontWeight: 700
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid #00d2ff', borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>คุณเลือกคำสั่งแล้ว! กำลังรอ @{activeBattle.opponentUsername} ตัดสินใจเลือกคำสั่ง...</span>
                </div>
              ) : activeBattle.opponentHasActed ? (
                <div style={{
                  background: 'rgba(241, 196, 15, 0.12)',
                  border: '1px solid rgba(241, 196, 15, 0.35)',
                  borderRadius: 12,
                  padding: '10px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: '#f1c40f',
                  fontWeight: 700,
                  fontSize: '0.88rem'
                }}>
                  <Sparkles size={16} />
                  <span>คู่ต่อสู้ (@{activeBattle.opponentUsername}) ได้ออกคำสั่งแล้ว! ถึงตาคุณตัดสินใจ</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Arena Display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }}>
            {/* Opponent Mon */}
            {(() => {
              const oppMon = activeBattle.opponentTeam[activeBattle.opponentActiveIndex];
              if (!oppMon) return null;
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
                  <div style={{ flex: '0 1 340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{oppMon.nickname || oppMon.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      {(oppMon.types || []).map(t => (
                        <span key={t} className="badge" style={{ background: TYPE_COLORS[t]?.bg || '#444', color: '#fff', fontSize: '0.65rem' }}>
                          {t}
                        </span>
                      ))}
                      {oppMon.held_item_name && (
                        <span className="badge" style={{ background: 'rgba(241, 196, 15, 0.2)', color: '#f1c40f', fontSize: '0.65rem' }}>
                          {oppMon.held_item_name}
                        </span>
                      )}
                    </div>

                    <div className="hp-bar-track">
                      <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: getHpColor(hpPct) }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      HP: {oppMon.hp} / {oppMon.maxHp} ({hpPct}%)
                    </div>

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
                          title={`${p.nickname || p.name}: ${p.hp > 0 ? 'พร้อมสู้' : 'หมดสติ'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={oppMon.artwork || oppMon.sprite} 
                      alt={oppMon.nickname || oppMon.name} 
                      className={`floating-pokemon ${oppAttacking ? 'anim-lunge-opp' : ''} ${oppHit ? 'anim-hit-shake' : ''}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                  </div>
                </div>
              );
            })()}

            {/* User Active Mon */}
            {(() => {
              const userMon = activeBattle.userTeam[activeBattle.userActiveIndex];
              if (!userMon) return null;
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
                  <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={userMon.artwork || userMon.sprite} 
                      alt={userMon.nickname} 
                      className={`floating-pokemon ${userAttacking ? 'anim-lunge-user' : ''} ${userHit ? 'anim-hit-shake' : ''} ${userMon.isMega ? 'mega-glow' : ''} ${userMon.isDynamax ? 'dynamax-aura' : ''} ${zMoveToggled ? 'z-aura' : ''}`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                  </div>

                  <div style={{ flex: '0 1 340px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{userMon.name}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {(userMon.types || []).map(t => (
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
                      <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: getHpColor(hpPct) }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      HP: <b style={{ color: '#fff' }}>{userMon.hp}</b> / {userMon.maxHp} ({hpPct}%)
                    </div>

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

          {/* Battle Logs */}
          <div
            ref={logRef}
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
            {(activeBattle.logs || []).map((line, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.85rem',
                  color: line.includes('ชนะ') ? '#f39c12' : line.includes('MEGA') || line.includes('DYNAMAX') ? '#9b51e0' : line.includes('คริติคอล') ? '#ff4757' : line.includes('หมดสติ') ? '#e74c3c' : 'var(--text-muted)',
                  fontWeight: line.includes('ชนะ') || line.includes('คริติคอล') || line.includes('หมดสติ') ? 700 : 400
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Controls & End Conditions */}
          {activeBattle.status === 'VICTORY' || activeBattle.isWinner ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: 'rgba(243, 156, 18, 0.15)',
              border: '1px solid rgba(243, 156, 18, 0.4)',
              borderRadius: 16
            }}>
              <Trophy size={48} style={{ color: '#f39c12', marginBottom: 12 }} />
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f39c12' }}>คว้าชัยชนะในสังเวียน PvP!</h2>
              <p style={{ color: 'var(--text-main)', margin: '8px 0 16px' }}>
                คุณได้รับเงินรางวัลเดิมพันทั้งหมด <b>+{activeBattle.prizePool.toLocaleString()} FUKU</b> เข้ากระเป๋าเรียบร้อยแล้ว!
              </p>
              <button onClick={() => { setActiveBattle(null); setMultiplayerRoomId(null); }} className="btn btn-primary" style={{ padding: '10px 28px' }}>
                กลับสู่ล็อบบี้ PvP
              </button>
            </div>
          ) : activeBattle.status === 'DEFEAT' || activeBattle.isLoser ? (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: 'rgba(255, 71, 87, 0.15)',
              border: '1px solid rgba(255, 71, 87, 0.4)',
              borderRadius: 16
            }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ff4757' }}>คุณพ่ายแพ้การประลอง PvP...</h2>
              <p style={{ color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                เสียเงินเดิมพัน {activeBattle.wager.toLocaleString()} FUKU ปรับแต่งกลยุทธ์แล้วมาท้าดวลใหม่!
              </p>
              <button onClick={() => { setActiveBattle(null); setMultiplayerRoomId(null); }} className="btn btn-outline" style={{ padding: '10px 28px' }}>
                กลับสู่ล็อบบี้ PvP
              </button>
            </div>
          ) : (
            (() => {
              const activeUserMon = activeBattle.userTeam[activeBattle.userActiveIndex];
              if (!activeUserMon) return null;
              const megaCheck = checkMegaEvolution(activeUserMon);
              const zMoveCheck = checkZMove(activeUserMon);
              const isLocked = activeBattle.waitingForOpponent || battleLoading;
              const isMegaDisabled = activeBattle.userMegaUsed || activeUserMon.isMega || !megaCheck.canMega || isLocked;
              const isZMoveDisabled = activeBattle.userZMoveUsed || !zMoveCheck.canZMove || isLocked;
              const isDynamaxDisabled = activeBattle.userDynamaxUsed || activeUserMon.isDynamax || isLocked;

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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          if (!megaCheck.canMega || isLocked) return;
                          setMegaToggled(!megaToggled);
                          setZMoveToggled(false);
                          setDynamaxToggled(false);
                        }}
                        disabled={isMegaDisabled}
                        title={isMegaDisabled ? (megaCheck.reason || 'ไม่สามารถใช้ร่าง Mega ได้') : megaToggled ? 'ยกเลิกแปลงร่าง Mega' : 'กดเพื่อแปลงร่าง Mega ในเทิร์นนี้'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: megaToggled ? 'linear-gradient(135deg, #9b51e0 0%, #e056fd 100%)' : 'rgba(155, 81, 224, 0.12)',
                          border: megaToggled ? '1px solid #fff' : '1px solid rgba(155, 81, 224, 0.4)',
                          color: megaToggled ? '#fff' : '#bb86fc',
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: isMegaDisabled ? 'not-allowed' : 'pointer',
                          opacity: isMegaDisabled ? 0.4 : 1,
                          boxShadow: megaToggled ? '0 0 15px rgba(155, 81, 224, 0.6)' : 'none'
                        }}
                      >
                        <Zap size={14} />
                        <span>{activeBattle.userMegaUsed ? 'MEGA ใช้แล้ว' : megaToggled ? 'MEGA: แปลงร่าง' : 'MEGA'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!zMoveCheck.canZMove || isLocked) return;
                          setZMoveToggled(!zMoveToggled);
                          setMegaToggled(false);
                          setDynamaxToggled(false);
                        }}
                        disabled={isZMoveDisabled}
                        title={isZMoveDisabled ? (zMoveCheck.reason || 'ไม่สามารถใช้ Z-Move ได้') : zMoveToggled ? 'ยกเลิกใช้ Z-Move' : 'กดเพื่อปล่อยท่าไม้ตาย Z-Move ในเทิร์นนี้'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: zMoveToggled ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'rgba(243, 156, 18, 0.12)',
                          border: zMoveToggled ? '1px solid #fff' : '1px solid rgba(243, 156, 18, 0.4)',
                          color: zMoveToggled ? '#fff' : '#f39c12',
                          padding: '6px 12px',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: isZMoveDisabled ? 'not-allowed' : 'pointer',
                          opacity: isZMoveDisabled ? 0.4 : 1,
                          boxShadow: zMoveToggled ? '0 0 15px rgba(243, 156, 18, 0.6)' : 'none'
                        }}
                      >
                        <Zap size={14} />
                        <span>{activeBattle.userZMoveUsed ? 'Z-MOVE ใช้แล้ว' : zMoveToggled ? 'Z-MOVE: ชาร์จ' : 'Z-MOVE'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (isLocked) return;
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
                          boxShadow: dynamaxToggled ? '0 0 15px rgba(255, 71, 87, 0.6)' : 'none'
                        }}
                      >
                        <Flame size={14} />
                        <span>{activeBattle.userDynamaxUsed ? 'DYNAMAX ใช้แล้ว' : dynamaxToggled ? 'DYNAMAX: ขยาย' : 'DYNAMAX'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setShowBagModal(true)}
                        disabled={isLocked}
                        className="btn btn-outline"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: '#2ed573', color: '#2ed573' }}
                      >
                        <ShoppingBag size={14} />
                        <span>ใช้ไอเท็ม (BAG)</span>
                      </button>

                      <button
                        onClick={() => setShowSwitchModal(true)}
                        disabled={isLocked}
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
                          disabled={isLocked}
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
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.6 : 1,
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            if (!isLocked) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = `0 4px 15px ${conf.bg}44`;
                            }
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

          {/* Switch Mon Modal */}
          {showSwitchModal && (
            <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>
                  เลือกโปเกมอนที่จะส่งลงสังเวียน
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
                            HP: {p.hp} / {p.maxHp} {isFainted && '(หมดสติ)'} {isCurrent && '(กำลังสู้)'}
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

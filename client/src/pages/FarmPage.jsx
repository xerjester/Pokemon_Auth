import React, { useState, useEffect } from 'react';
import { Sparkles, Coins, Gift, Compass, Swords, ShieldCheck, CheckCircle2, Clock, AlertCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TYPE_COLORS } from '../utils/typeColors';

export default function FarmPage({ user, onRefreshUser, onNavigateToBattle, onNavigateToTeam }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [wildBattling, setWildBattling] = useState(false);
  const [wildResult, setWildResult] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [claimingQuestId, setClaimingQuestId] = useState(null);
  const [wildCooldown, setWildCooldown] = useState(0);

  useEffect(() => {
    fetchFarmingStatus();
  }, [user]);

  useEffect(() => {
    if (wildCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setWildCooldown(seconds => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [wildCooldown]);

  const fetchFarmingStatus = async () => {
    try {
      const token = localStorage.getItem('pokemon_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch('/api/farming/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setWildCooldown(data.wild_battle?.seconds_remaining || 0);
      }
    } catch (err) {
      console.error('Error fetching farming status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimFaucet = async () => {
    setClaimingFaucet(true);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/farming/daily-faucet', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถรับเงินสนับสนุนได้');
      } else {
        setMessage(data.message);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        fetchFarmingStatus();
        if (onRefreshUser) onRefreshUser();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setClaimingFaucet(false);
    }
  };

  const handleWildBattle = async () => {
    setWildBattling(true);
    setError('');
    setMessage('');
    setWildResult(null);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/farming/wild-battle', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถออกสำรวจได้');
        setWildCooldown(data.seconds_remaining || 0);
      } else {
        setWildResult(data);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        fetchFarmingStatus();
        if (onRefreshUser) onRefreshUser();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setWildBattling(false);
    }
  };

  const handleClaimQuest = async (questId) => {
    setClaimingQuestId(questId);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/farming/claim-quest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ questId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถรับรางวัลภารกิจได้');
      } else {
        setMessage(data.message);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        fetchFarmingStatus();
        if (onRefreshUser) onRefreshUser();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการรับรางวัล');
    } finally {
      setClaimingQuestId(null);
    }
  };

  const formatTimer = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const wildBattleAvailable = wildCooldown <= 0;

  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 480,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-glass)',
          borderRadius: 20,
          padding: '40px 30px'
        }}>
          <Sparkles size={48} style={{ color: '#f39c12', marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 10 }}>ระบบฟาร์มเงินผู้เล่นใหม่</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
            กรุณาเข้าสู่ระบบเพื่อรับเงินสนับสนุนประจำวัน (+3,000 FUKU) และออกสำรวจทุ่งหญ้าเพื่อฟาร์มเหรียญฟรีได้ไม่จำกัด!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.15) 0%, rgba(0, 210, 255, 0.1) 100%)',
        border: '1px solid rgba(46, 213, 115, 0.3)',
        borderRadius: 24,
        padding: '28px 32px',
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(46, 213, 115, 0.2)', color: '#2ed573', padding: '4px 12px', borderRadius: 9999, fontSize: '0.78rem', fontWeight: 800, marginBottom: 10 }}>
            <Sparkles size={14} />
            <span>NEW PLAYER FRIENDLY • ศูนย์ฟาร์มเหรียญ</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>
            ศูนย์ฝึก & ฟาร์มเหรียญ FUKU
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 640 }}>
            ผู้เล่นใหม่สามารถรับเงินสนับสนุนรายวัน, ออกสำรวจต่อสู้กับโปเกมอนป่าเพื่อฟาร์มเงินฟรีได้ไม่จำกัดรอบ, และทำภารกิจรายวันเพื่อสะสม FUKU สำหรับเปิดการประมูลและซื้อไอเท็ม!
          </p>
        </div>

        {/* Current Balance Display */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(243, 156, 18, 0.4)',
          borderRadius: 16,
          padding: '16px 24px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 4 }}>ยอดเงินในคลังปัจจุบัน</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coins size={24} />
            <span>{Number(user.fuku_balance || 0).toLocaleString()} FUKU</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div style={{
          background: 'rgba(46, 213, 115, 0.15)',
          border: '1px solid #2ed573',
          color: '#2ed573',
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 24,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(255, 71, 87, 0.15)',
          border: '1px solid #ff4757',
          color: '#ff4757',
          padding: '12px 18px',
          borderRadius: 12,
          marginBottom: 24,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 1. Daily Faucet & 2. Wild Battle Expedition */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 36
      }}>
        {/* Card 1: Daily Faucet */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.08) 0%, rgba(20, 24, 40, 0.95) 100%)',
          border: '1px solid rgba(243, 156, 18, 0.35)',
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(243, 156, 18, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f39c12'
              }}>
                <Gift size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>เงินสนับสนุนประจำวัน</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Daily Trainer Faucet</div>
              </div>
            </div>

            <span className="badge" style={{ background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', fontWeight: 800 }}>
              +3,000 FUKU
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, flex: 1 }}>
            สิทธิพิเศษสำหรับผู้เล่นทุกคน สามารถกดรับเหรียญสนับสนุนได้วันละ 1 ครั้ง เพื่อนำไปใช้เป็นทุนเริ่มต้นในการประมูลโปเกมอน ซื้อโพชั่น หรือท้าประลอง
          </p>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>สถานะการรับ:</span>
            {status?.faucet?.available ? (
              <span style={{ color: '#2ed573', fontWeight: 700, fontSize: '0.85rem' }}>พร้อมรับทันที!</span>
            ) : (
              <span style={{ color: '#f39c12', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />
                <span>รอรอบถัดไป ({formatTimer(status?.faucet?.seconds_remaining)})</span>
              </span>
            )}
          </div>

          <button
            onClick={handleClaimFaucet}
            disabled={claimingFaucet || !status?.faucet?.available}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.95rem',
              opacity: status?.faucet?.available ? 1 : 0.5,
              cursor: status?.faucet?.available ? 'pointer' : 'not-allowed'
            }}
          >
            {claimingFaucet ? 'กำลังรับรางวัล...' : status?.faucet?.available ? 'กดรับ 3,000 FUKU ตอนนี้' : 'รับแล้ว (รอรอบถัดไป)'}
          </button>
        </div>

        {/* Card 2: Wild Battle Expedition */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.08) 0%, rgba(20, 24, 40, 0.95) 100%)',
          border: '1px solid rgba(46, 213, 115, 0.35)',
          borderRadius: 20,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(46, 213, 115, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2ed573'
              }}>
                <Compass size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>สำรวจทุ่งหญ้าโปเกมอนป่า</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Wild Battle Expedition</div>
              </div>
            </div>

            <span className="badge" style={{ background: 'rgba(46, 213, 115, 0.2)', color: '#2ed573', fontWeight: 800 }}>
              สำรวจซ้ำได้ทุก 1 นาที
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20, flex: 1 }}>
            ส่งโปเกมอนของคุณออกไปสำรวจทุ่งหญ้า ต่อสู้กับโปเกมอนป่าที่สุ่มจากสารานุกรมทั้ง 1,025 ตัว รับ FUKU พร้อมโอกาสสุ่มดรอปไอเท็มฟื้นฟู (Potion, Super Potion, Revive) และออกสำรวจครั้งถัดไปได้หลัง cooldown 1 นาที
          </p>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>สถิติชนะโปเกมอนป่า:</span>
            <span style={{ color: '#00d2ff', fontWeight: 800, fontSize: '0.9rem' }}>
              {status?.wild_battles_won || 0} ครั้ง
            </span>
          </div>

          <button
            onClick={handleWildBattle}
            disabled={wildBattling || !wildBattleAvailable}
            className="btn btn-outline"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '0.95rem',
              borderColor: '#2ed573',
              color: '#2ed573',
              fontWeight: 800
            }}
          >
            {wildBattling ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={16} className="spin" />
                <span>กำลังออกสำรวจและต่อสู้...</span>
              </span>
            ) : (
                <span>{wildBattleAvailable ? 'ออกสำรวจทุ่งหญ้า' : `รออีก ${formatTimer(wildCooldown)}`}</span>
            )}
          </button>
        </div>
      </div>

      {/* Wild Battle Result Popup Card */}
      {wildResult && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 20, 36, 0.98) 0%, rgba(9, 12, 21, 0.98) 100%)',
          border: '1px solid #2ed573',
          borderRadius: 20,
          padding: 24,
          marginBottom: 36,
          boxShadow: '0 15px 40px rgba(46, 213, 115, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2ed573', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={20} />
              <span>ผลการออกสำรวจทุ่งหญ้า: ชนะการต่อสู้!</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#f39c12', fontWeight: 800, fontSize: '1.1rem' }}>
                +{wildResult.rewardFuku.toLocaleString()} FUKU
              </span>
              <button 
                onClick={() => setWildResult(null)}
                className="btn btn-outline"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                ปิด
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={wildResult.wildPokemon.artwork || wildResult.wildPokemon.sprite} alt={wildResult.wildPokemon.name} style={{ width: 64, height: 64, objectFit: 'contain' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{wildResult.wildPokemon.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  ธาตุ: {wildResult.wildPokemon.types.join(', ')}
                </div>
              </div>
            </div>

            {wildResult.droppedItem && (
              <div style={{
                padding: '8px 14px',
                borderRadius: 12
              }}>
                <img src={wildResult.droppedItem.icon_url} alt={wildResult.droppedItem.name} style={{ width: 32, height: 32 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#a55eea', fontWeight: 700 }}>ไอเท็มดรอปพิเศษ!</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{wildResult.droppedItem.name}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 12,
            padding: 14,
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            {wildResult.logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Daily Trainer Quests */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} style={{ color: '#00d2ff' }} />
            <span>ภารกิจฝึกฝนประจำวัน (Daily Quests)</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>รีเซ็ตทุกวัน</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(status?.quests || []).map(quest => {
            const isClaimable = quest.completed && !quest.claimed;
            return (
              <div
                key={quest.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: quest.claimed ? '1px solid rgba(255, 255, 255, 0.1)' : isClaimable ? '1px solid #2ed573' : '1px solid var(--border-glass)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{quest.title}</span>
                    <span style={{ fontSize: '0.8rem', color: '#f39c12', fontWeight: 700 }}>+{quest.reward.toLocaleString()} FUKU</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8 }}>{quest.hint}</div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', maxWidth: 280, height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                      height: '100%',
                      background: quest.completed ? '#2ed573' : '#00d2ff',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div>
                  {quest.claimed ? (
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} style={{ color: '#2ed573' }} />
                      <span>รับรางวัลแล้ว</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleClaimQuest(quest.id)}
                      disabled={!isClaimable || claimingQuestId === quest.id}
                      className={isClaimable ? "btn btn-primary" : "btn btn-outline"}
                      style={{
                        padding: '8px 18px',
                        fontSize: '0.85rem',
                        opacity: isClaimable ? 1 : 0.4,
                        cursor: isClaimable ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {claimingQuestId === quest.id ? 'กำลังรับ...' : isClaimable ? 'กดรับรางวัล' : `ความคืบหน้า (${quest.progress}/${quest.target})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Beginner Strategy Guide Card */}
      <div style={{
        background: 'rgba(0, 210, 255, 0.04)',
        border: '1px solid rgba(0, 210, 255, 0.25)',
        borderRadius: 20,
        padding: 24
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00d2ff', marginBottom: 10 }}>
          เคล็ดลับการจัดทีมสำหรับผู้เล่นใหม่ (ไม่มีระบบ Level แล้ว วัดที่การจัดทีมล้วนๆ!)
        </h3>
        <ul style={{ paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <li><b>ยิมที่ 1 Brock:</b> Geodude และ Onix แพ้ทางธาตุ <b>น้ำ (Water)</b> และ <b>พืช (Grass)</b> รุนแรงถึง 4 เท่า! ใช้สกิลน้ำหรือพืชโจมตีเพียง 1-2 ครั้งก็ชนะได้ทันที</li>
          <li><b>ค่าสเตตัสมาตรฐาน (BST):</b> โปเกมอนทุกตัวใช้พลังตามค่าสเตตัสจริงของสายพันธุ์ จัดทีมด้วยธาตุที่ได้เปรียบและคอมโบสกิลเพื่อเอาชนะคู่แข่ง</li>
          <li><b>Mega Evolution & Z-Move:</b> ต้องสวมใส่หินเมก้าหรือผลึก Z-Crystal ที่ตรงกับสายพันธุ์และธาตุเท่านั้น ไม่สามารถเปิดมั่วได้</li>
          <li><b>เงิน FUKU หมด:</b> สามารถกลับมาที่หน้านี้เพื่อรับเงินประจำวันและสำรวจทุ่งหญ้าโปเกมอนป่าเพื่อฟาร์มเงินฟรีได้ตลอดเวลา</li>
        </ul>
      </div>
    </div>
  );
}

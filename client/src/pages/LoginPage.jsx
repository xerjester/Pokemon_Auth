import React, { useState } from 'react';
import { X, LogIn, UserPlus, Sparkles, AlertCircle, Shield } from 'lucide-react';

export default function LoginPage({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { username, email, password } 
        : { usernameOrEmail: username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');

      localStorage.setItem('pokemon_token', data.token);
      alert(data.message || (isRegister ? 'สมัครสมาชิกสำเร็จ!' : 'เข้าสู่ระบบสำเร็จ!'));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname, pass) => {
    setUsername(uname);
    setPassword(pass);
    setIsRegister(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {isRegister ? 'สมัครสมาชิกใหม่' : 'เข้าสู่ระบบ'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 10,
          padding: 4,
          marginBottom: 20
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: !isRegister ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: !isRegister ? '#fff' : 'var(--text-dim)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              background: isRegister ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: isRegister ? '#fff' : 'var(--text-dim)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            สมัครสมาชิกใหม่
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

        {isRegister && (
          <div style={{
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: '0.8rem',
            color: 'var(--accent-cyan)'
          }}>
            สิทธิพิเศษ: รับฟรีทันที <b>10,000 FUKU</b> และโปเกมอนเริ่มต้น 1 ตัวเข้าสู่คลัง!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              {isRegister ? 'ชื่อผู้ใช้ (Username)' : 'ชื่อผู้ใช้ หรือ อีเมล'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="เช่น ash_ketchum"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                อีเมล (Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ash@pallet.town"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 0', marginTop: 10 }}
          >
            {loading ? 'กำลังดำเนินการ...' : isRegister ? 'ยืนยันการสมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8, textAlign: 'center' }}>
            ทดสอบด่วนด้วยบัญชีเดโมเริ่มต้น:
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('ash_ketchum', 'pika1234')}
              className="btn btn-outline"
              style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
            >
              Ash (50k)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('gary_oak', 'blastoise123')}
              className="btn btn-outline"
              style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
            >
              Gary (100k)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('red_champion', 'charizard123')}
              className="btn btn-outline"
              style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
            >
              Red (250k)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

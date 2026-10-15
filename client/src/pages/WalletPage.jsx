import React, { useState, useEffect } from 'react';
import { 
  Coins, Wallet, ExternalLink, ShieldCheck, 
  ArrowDownCircle, ArrowUpCircle, History, AlertCircle, Loader2,
  Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';
import { FUKU_CONTRACT_ADDRESS, connectWallet, transferFuku, addFukuTokenToMetaMask } from '../utils/web3';

export default function WalletPage({ user, onRefreshUser, walletAddress, setWalletAddress, onChainFuku, onRefreshBalance, onNavigateToFarm }) {
  const [depositAddress, setDepositAddress] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [customWithdrawTo, setCustomWithdrawTo] = useState('');
  
  // Deposit & Withdraw step loaders
  const [depositStep, setDepositStep] = useState(null); // 'prompt' | 'verifying' | null
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [claimingFaucet, setClaimingFaucet] = useState(false);

  // Transaction history
  const [transactions, setTransactions] = useState({ deposits: [], withdrawals: [] });
  const [historyTab, setHistoryTab] = useState('deposits');
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch('/api/web3/contract-info')
      .then(res => res.json())
      .then(data => setDepositAddress(data.depositAddress || ''))
      .catch(() => setDepositAddress(''));

    fetchTransactionHistory();
  }, [user]);

  const fetchTransactionHistory = async () => {
    const token = localStorage.getItem('pokemon_token');
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/web3/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (e) {
      console.warn('Could not load transaction history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!walletAddress) {
      alert('กรุณาเชื่อมต่อ MetaMask ก่อนฝาก FUKU');
      return;
    }
    if (!depositAddress) {
      alert('ระบบยังไม่ได้ตั้งค่ากระเป๋ารับฝาก (FUKU_DEPOSIT_ADDRESS)');
      return;
    }
    const num = Number(depositAmount);
    if (!num || num <= 0) {
      alert('กรุณาระบุจำนวน FUKU ที่ต้องการฝากให้ถูกต้อง');
      return;
    }
    if (num > Number(onChainFuku || 0)) {
      alert(`ยอดเหรียญ FUKU บน MetaMask ของคุณไม่เพียงพอ (มีอยู่ ${parseFloat(onChainFuku || 0).toLocaleString()} FUKU)\n\nหากต้องการทดสอบ สามารถกดปุ่ม "ฝากเหรียญแบบจำลองด่วน" หรือ "รับเหรียญทดสอบฟรี" ด้านบนได้ทันที`);
      return;
    }

    try {
      setDepositStep('prompt'); // Waiting for MetaMask approval
      const hash = await transferFuku(depositAddress, depositAmount);

      setDepositStep('verifying'); // Verifying on BSC Testnet & updating DB
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/web3/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ txHash: hash, walletAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ยืนยันการฝากไม่สำเร็จ');

      alert(data.message);
      setDepositAmount('');
      if (onRefreshUser) onRefreshUser();
      if (onRefreshBalance) onRefreshBalance();
      fetchTransactionHistory();
    } catch (err) {
      alert(err.reason || err.shortMessage || err.message || 'ฝาก FUKU ไม่สำเร็จ');
    } finally {
      setDepositStep(null);
    }
  };

  const handleDemoDeposit = async () => {
    const amount = Number(depositAmount) > 0 ? Number(depositAmount) : 5000;
    try {
      setDepositStep('verifying');
      const token = localStorage.getItem('pokemon_token');
      const simHash = 'demo_' + Date.now();
      const res = await fetch('/api/web3/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          txHash: simHash, 
          walletAddress: walletAddress || user?.wallet_address || '0x267db26f3c687fa7b5c323a750fb82c1a375b9fe' 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'จำลองการฝากไม่สำเร็จ');

      alert(data.message);
      setDepositAmount('');
      if (onRefreshUser) onRefreshUser();
      if (onRefreshBalance) onRefreshBalance();
      fetchTransactionHistory();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการจำลองฝาก');
    } finally {
      setDepositStep(null);
    }
  };

  const handleWithdraw = async () => {
    const targetAddress = customWithdrawTo.trim() || walletAddress || user?.wallet_address;
    if (!targetAddress) {
      alert('กรุณาเชื่อมต่อ MetaMask หรือระบุที่อยู่กระเป๋าเพื่อรับเหรียญ FUKU');
      return;
    }
    const num = Number(withdrawAmount);
    if (!num || num <= 0) {
      alert('กรุณาระบุจำนวน FUKU ที่ต้องการถอนให้ถูกต้อง');
      return;
    }
    if (num > Number(user?.fuku_balance || 0)) {
      alert(`ยอดเหรียญ FUKU ในเกมของคุณไม่เพียงพอ (มีอยู่ ${Number(user?.fuku_balance || 0).toLocaleString()} FUKU)`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/web3/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: withdrawAmount, to: targetAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ถอน FUKU ไม่สำเร็จ');

      alert(`${data.message}\nTx Hash: ${data.txHash}`);
      setWithdrawAmount('');
      if (onRefreshUser) onRefreshUser();
      if (onRefreshBalance) onRefreshBalance();
      fetchTransactionHistory();
    } catch (err) {
      alert(err.message || 'ถอน FUKU ไม่สำเร็จ');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleClaimFaucet = async () => {
    setClaimingFaucet(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch('/api/auth/claim-faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'รับเหรียญทดสอบไม่สำเร็จ');
      alert(data.message || '🎉 รับ 5,000 FUKU สำเร็จ!');
      if (onRefreshUser) onRefreshUser();
      if (onRefreshBalance) onRefreshBalance();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรับเหรียญ');
    } finally {
      setClaimingFaucet(false);
    }
  };

  const shortenHash = (hash) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero Banner (matches AuctionPage & FarmPage aesthetic) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 26, 43, 0.9) 0%, rgba(13, 20, 36, 0.95) 100%)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
        padding: '32px 36px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {/* Ambient radial glow */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: 50,
          width: 260,
          height: 260,
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0, 210, 255, 0.12)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              color: '#00d2ff',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: '0.78rem',
              fontWeight: 800,
              marginBottom: 10
            }}>
              <ShieldCheck size={14} />
              <span>WEB3 GATEWAY • BNB SMART CHAIN TESTNET</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 8 }}>
              FUKU Token Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 640, margin: 0, lineHeight: 1.6 }}>
              ศูนย์กลางบริหารจัดการเหรียญ FUKU สำหรับประมูลโปเกมอน ซื้อไอเท็มใน PokéMart และลงเดิมพัน PvP เชื่อมต่อกับกระเป๋า MetaMask บนเครือข่ายบล็อกเชนแบบไร้รอยต่อ
            </p>
          </div>

          {/* Connection Status / Header Actions Widget */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleClaimFaucet}
              disabled={claimingFaucet}
              className="btn btn-outline"
              style={{
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderColor: 'rgba(243, 156, 18, 0.5)',
                color: '#f39c12',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Sparkles size={16} />
              <span>{claimingFaucet ? 'กำลังรับเหรียญ...' : 'รับฟรี +5,000 FUKU'}</span>
            </button>

            {!walletAddress ? (
              <button
                onClick={async () => {
                  try {
                    const addr = await connectWallet();
                    setWalletAddress(addr);
                  } catch (e) {
                    alert(e.message);
                  }
                }}
                className="btn btn-cyan"
                style={{ padding: '10px 20px', fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 20px rgba(0, 210, 255, 0.3)' }}
              >
                <Wallet size={16} />
                <span>เชื่อมต่อ MetaMask</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={addFukuTokenToMetaMask}
                  className="btn btn-outline"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', borderColor: 'rgba(0, 210, 255, 0.4)', color: '#00d2ff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Coins size={14} />
                  <span>เพิ่ม FUKU ใน MetaMask</span>
                </button>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(0, 210, 255, 0.35)',
                  borderRadius: 12,
                  padding: '8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#2ed573', fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ed573', boxShadow: '0 0 8px #2ed573', display: 'inline-block' }} />
                    <span>เชื่อมต่อกระเป๋าแล้ว</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balances 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Card 1: In-game Balance */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.08) 0%, rgba(20, 24, 40, 0.95) 100%)',
          border: '1px solid rgba(243, 156, 18, 0.35)',
          borderRadius: 20,
          padding: 26,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 140,
            height: 140,
            background: 'radial-gradient(circle, rgba(243, 156, 18, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f39c12', fontWeight: 800, fontSize: '0.9rem' }}>
                <Coins size={20} />
                <span>ยอดคงเหลือในเกม (In-Game Balance)</span>
              </div>
              <span className="badge" style={{ background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', fontSize: '0.72rem', fontWeight: 700 }}>
                พร้อมใช้งาน
              </span>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.5px' }}>
              {Number(user?.fuku_balance || 0).toLocaleString()} <span style={{ fontSize: '1.2rem', color: '#f39c12', fontWeight: 800 }}>FUKU</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
              ใช้สำหรับประมูลโปเกมอน, สั่งซื้อไอเท็มใน PokéMart, และวางเดิมพันในสนามประลอง PvP
            </p>
          </div>

          {onNavigateToFarm && (
            <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>เหรียญไม่พอ? รับเงินรายวันและสำรวจฟรี</span>
              <button
                onClick={onNavigateToFarm}
                className="btn btn-outline"
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: '#f39c12', color: '#f39c12', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span>ศูนย์ฟาร์มเหรียญ</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Card 2: On-chain Balance */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.08) 0%, rgba(16, 24, 45, 0.95) 100%)',
          border: '1px solid rgba(0, 210, 255, 0.35)',
          borderRadius: 20,
          padding: 26,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 140,
            height: 140,
            background: 'radial-gradient(circle, rgba(0, 210, 255, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00d2ff', fontWeight: 800, fontSize: '0.9rem' }}>
                <Wallet size={20} />
                <span>ยอดบนกระเป๋า MetaMask (On-Chain)</span>
              </div>
              {walletAddress ? (
                <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.2)', color: '#00d2ff', fontSize: '0.72rem', fontWeight: 700 }}>
                  BSC Testnet
                </span>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const addr = await connectWallet();
                      setWalletAddress(addr);
                    } catch (e) {
                      alert(e.message);
                    }
                  }}
                  className="btn btn-outline"
                  style={{ padding: '2px 10px', fontSize: '0.72rem', borderColor: '#00d2ff', color: '#00d2ff' }}
                >
                  เชื่อมต่อ
                </button>
              )}
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.5px' }}>
              {walletAddress ? parseFloat(onChainFuku || 0).toLocaleString() : '0.00'} <span style={{ fontSize: '1.2rem', color: '#00d2ff', fontWeight: 800 }}>FUKU</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
              {walletAddress ? (
                `ที่อยู่กระเป๋า: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
              ) : (
                <div>
                  <span>ยังไม่ได้เชื่อมต่อ MetaMask กดปุ่มเชื่อมต่อเพื่อเริ่มทำธุรกรรม</span>
                  {user?.wallet_address && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
                      กระเป๋าที่ผูกไว้กับบัญชี: <span style={{ color: '#74b9ff', fontFamily: 'monospace' }}>{user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}</span> (รอปลดล็อค MetaMask)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>FUKU Token Smart Contract</span>
            <a
              href={`https://testnet.bscscan.com/token/${FUKU_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#74b9ff', textDecoration: 'none', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span>ดูข้อมูลบน BscScan</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Deposit & Withdraw 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 36 }}>
        {/* Card 1: Deposit */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 25, 45, 0.9) 0%, rgba(10, 18, 32, 0.95) 100%)',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(0, 210, 255, 0.15)', padding: 10, borderRadius: 12, color: '#00d2ff' }}>
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>ฝาก FUKU เข้าเกม (Deposit)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>โอนจาก MetaMask เข้าสู่กระเป๋ากลางเพื่อเพิ่มยอดในเกม</p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 18, fontSize: '0.8rem', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>จาก (From):</span>
              <span style={{ color: walletAddress ? '#74b9ff' : '#ff7675', fontWeight: 700 }}>
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'ยังไม่ได้เชื่อมต่อ MetaMask'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>คลังกลาง (To):</span>
              <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>
                {depositAddress ? `${depositAddress.slice(0, 6)}...${depositAddress.slice(-4)}` : 'กำลังตรวจสอบ...'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>จำนวน FUKU ที่ต้องการฝาก:</label>
              <button
                type="button"
                onClick={() => setDepositAmount(String(onChainFuku || '0'))}
                className="btn btn-outline"
                style={{ padding: '3px 10px', fontSize: '0.72rem', borderColor: '#00d2ff', color: '#00d2ff', fontWeight: 700 }}
              >
                MAX ({parseFloat(onChainFuku || 0).toLocaleString()})
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="ระบุจำนวนเหรียญที่จะฝาก"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(0, 210, 255, 0.3)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleDeposit}
              disabled={!!depositStep || !walletAddress}
              className="btn btn-cyan"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              {depositStep === 'prompt' && (
                <>
                  <Loader2 size={18} className="spinning" />
                  <span>กรุณายืนยันธุรกรรมใน MetaMask...</span>
                </>
              )}
              {depositStep === 'verifying' && (
                <>
                  <Loader2 size={18} className="spinning" />
                  <span>กำลังตรวจสอบธุรกรรมบนบล็อกเชน...</span>
                </>
              )}
              {!depositStep && (
                <>
                  <ArrowDownCircle size={18} />
                  <span>ยืนยันการฝาก FUKU เข้าเกม</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDemoDeposit}
              disabled={!!depositStep}
              className="btn btn-outline"
              style={{
                width: '100%',
                padding: '9px',
                fontSize: '0.82rem',
                borderColor: 'rgba(0, 210, 255, 0.4)',
                color: '#00d2ff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Sparkles size={14} />
              <span>ฝากเหรียญทดสอบระบบ (+5,000 FUKU ด่วน)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Withdraw */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 35, 28, 0.9) 0%, rgba(10, 24, 20, 0.95) 100%)',
          border: '1px solid rgba(46, 213, 115, 0.3)',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(46, 213, 115, 0.15)', padding: 10, borderRadius: 12, color: '#2ed573' }}>
              <ArrowUpCircle size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>ถอน FUKU กลับ MetaMask (Withdraw)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>โอนเหรียญจากยอดในเกมกลับเข้ากระเป๋าของคุณบน BSC</p>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 18, fontSize: '0.8rem', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>จากในเกม (From):</span>
              <span style={{ color: '#f39c12', fontWeight: 700 }}>{Number(user?.fuku_balance || 0).toLocaleString()} FUKU</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>ปลายทาง MetaMask (To):</span>
              <span style={{ color: (customWithdrawTo.trim() || walletAddress) ? '#74b9ff' : '#ff7675', fontWeight: 700 }}>
                {(customWithdrawTo.trim() || walletAddress) ? `${(customWithdrawTo.trim() || walletAddress).slice(0, 6)}...${(customWithdrawTo.trim() || walletAddress).slice(-4)}` : 'ยังไม่ได้เชื่อมต่อ MetaMask'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              ที่อยู่กระเป๋าปลายทางรับเหรียญ (ระบุเองได้):
            </label>
            <input
              type="text"
              value={customWithdrawTo}
              onChange={e => setCustomWithdrawTo(e.target.value)}
              placeholder={walletAddress || '0x... หรือเชื่อมต่อ MetaMask'}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 10,
                border: '1px solid rgba(46, 213, 115, 0.25)',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>จำนวน FUKU ที่ต้องการถอน:</label>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(user?.fuku_balance || '0'))}
                className="btn btn-outline"
                style={{ padding: '3px 10px', fontSize: '0.72rem', borderColor: '#2ed573', color: '#2ed573', fontWeight: 700 }}
              >
                MAX ({Number(user?.fuku_balance || 0).toLocaleString()})
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="ระบุจำนวนเหรียญที่จะถอน"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid rgba(46, 213, 115, 0.3)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: 700,
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawLoading || (!walletAddress && !customWithdrawTo.trim())}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #2ed573 0%, #10ac84 100%)',
              border: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              cursor: (withdrawLoading || (!walletAddress && !customWithdrawTo.trim())) ? 'not-allowed' : 'pointer',
              opacity: (withdrawLoading || (!walletAddress && !customWithdrawTo.trim())) ? 0.6 : 1
            }}
          >
            {withdrawLoading ? (
              <>
                <Loader2 size={18} className="spinning" />
                <span>กำลังดำเนินการถอนเหรียญ...</span>
              </>
            ) : (
              <>
                <ArrowUpCircle size={18} />
                <span>ยืนยันการถอน FUKU สู่ MetaMask</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transaction History Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
        padding: 28,
        marginBottom: 36
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={20} style={{ color: '#00d2ff' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>ประวัติการฝาก-ถอน (Transaction History)</h3>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setHistoryTab('deposits')}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: historyTab === 'deposits' ? '1px solid #00d2ff' : '1px solid var(--border-glass)',
                background: historyTab === 'deposits' ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255,255,255,0.02)',
                color: historyTab === 'deposits' ? '#00d2ff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ประวัติการฝาก ({transactions.deposits.length})
            </button>
            <button
              onClick={() => setHistoryTab('withdrawals')}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: historyTab === 'withdrawals' ? '1px solid #2ed573' : '1px solid var(--border-glass)',
                background: historyTab === 'withdrawals' ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255,255,255,0.02)',
                color: historyTab === 'withdrawals' ? '#2ed573' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ประวัติการถอน ({transactions.withdrawals.length})
            </button>
          </div>
        </div>

        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
            <Loader2 size={26} className="spinning" style={{ margin: '0 auto 10px' }} />
            <div>กำลังโหลดประวัติธุรกรรม...</div>
          </div>
        ) : historyTab === 'deposits' ? (
          transactions.deposits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              ยังไม่มีประวัติการฝากเหรียญ FUKU
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '12px 14px' }}>วันที่ / เวลา</th>
                    <th style={{ padding: '12px 14px' }}>จำนวน</th>
                    <th style={{ padding: '12px 14px' }}>จากกระเป๋า</th>
                    <th style={{ padding: '12px 14px' }}>Transaction Hash</th>
                    <th style={{ padding: '12px 14px' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.deposits.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {new Date(d.created_at).toLocaleString('th-TH')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#00d2ff' }}>
                        +{Number(d.amount).toLocaleString()} FUKU
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                        {d.from_address ? `${d.from_address.slice(0, 6)}...${d.from_address.slice(-4)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <a
                          href={`https://testnet.bscscan.com/tx/${d.tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#74b9ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}
                        >
                          <span>{shortenHash(d.tx_hash)}</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                          สำเร็จ
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          transactions.withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              ยังไม่มีประวัติการถอนเหรียญ FUKU
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '12px 14px' }}>วันที่ / เวลา</th>
                    <th style={{ padding: '12px 14px' }}>จำนวน</th>
                    <th style={{ padding: '12px 14px' }}>ไปยังกระเป๋า</th>
                    <th style={{ padding: '12px 14px' }}>Transaction Hash</th>
                    <th style={{ padding: '12px 14px' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.withdrawals.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {new Date(w.created_at).toLocaleString('th-TH')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2ed573' }}>
                        -{Number(w.amount).toLocaleString()} FUKU
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                        {w.to_address ? `${w.to_address.slice(0, 6)}...${w.to_address.slice(-4)}` : '-'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {w.tx_hash ? (
                          <a
                            href={`https://testnet.bscscan.com/tx/${w.tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#74b9ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace' }}
                          >
                            <span>{shortenHash(w.tx_hash)}</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>รอดำเนินการ</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                          สำเร็จ
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

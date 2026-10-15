import React, { useState } from 'react';
import { X, Gavel, Zap, AlertCircle, Coins, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BidModal({ auction, onClose, onBidSuccess, userBalance }) {
  const minBid = auction.highest_bidder_id
    ? parseFloat(auction.current_bid) + Math.max(50, Math.round(parseFloat(auction.current_bid) * 0.05))
    : parseFloat(auction.start_bid);

  const [bidAmount, setBidAmount] = useState(minBid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleQuickAdd = (amount) => {
    setBidAmount(prev => Math.max(minBid, prev + amount));
  };

  const handleSubmitBid = async (isBuyout = false) => {
    setError('');
    const amountToBid = isBuyout ? parseFloat(auction.buyout_price) : bidAmount;

    if (amountToBid < minBid && !isBuyout) {
      setError(`ราคาประมูลขั้นต่ำคือ ${minBid.toLocaleString()} FUKU`);
      return;
    }

    if (userBalance < amountToBid) {
      setError(`เหรียญ FUKU ของคุณไม่เพียงพอ (ต้องการ ${amountToBid.toLocaleString()} FUKU, คุณมี ${userBalance.toLocaleString()} FUKU)`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pokemon_token');
      const res = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountToBid })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการประมูล');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      alert(data.message || 'เสนอราคาประมูลสำเร็จ!');
      onBidSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(243, 156, 18, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f39c12'
            }}>
              <Gavel size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>เสนอราคาประมูล</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{auction.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pokemon Brief */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-glass)',
          padding: 14,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <img 
            src={auction.artwork_url || auction.sprite_url} 
            alt={auction.name} 
            style={{ width: 64, height: 64, objectFit: 'contain' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{auction.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ราคาปัจจุบัน: <b style={{ color: '#f39c12' }}>{parseFloat(auction.current_bid).toLocaleString()} FUKU</b>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              ราคาเสนอขั้นต่ำ: {minBid.toLocaleString()} FUKU
            </div>
          </div>
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

        {/* Bid Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
            จำนวน FUKU ที่ต้องการเสนอ:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: 10,
                padding: '12px 16px',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#fff',
                outline: 'none'
              }}
            />
            <span style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontWeight: 700,
              color: '#f39c12',
              fontSize: '0.9rem'
            }}>
              FUKU
            </span>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[500, 1000, 5000, 10000].map(inc => (
            <button
              key={inc}
              type="button"
              onClick={() => handleQuickAdd(inc)}
              className="btn btn-outline"
              style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem' }}
            >
              +{inc >= 1000 ? `${inc/1000}k` : inc}
            </button>
          ))}
        </div>

        {/* Balance Status */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginBottom: 20
        }}>
          <span>กระเป๋าของคุณมี:</span>
          <span style={{ fontWeight: 700, color: '#f39c12' }}>{userBalance.toLocaleString()} FUKU</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleSubmitBid(false)}
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1, padding: '12px 0' }}
          >
            <Gavel size={18} />
            <span>{loading ? 'กำลังส่งข้อมูล...' : `ยืนยันเสนอราคา ${bidAmount.toLocaleString()} FUKU`}</span>
          </button>

          {auction.buyout_price && (
            <button
              onClick={() => handleSubmitBid(true)}
              disabled={loading}
              className="btn btn-cyan"
              style={{ padding: '12px 16px' }}
              title={`ซื้อทันทีในราคา ${parseFloat(auction.buyout_price).toLocaleString()} FUKU`}
            >
              <Zap size={18} />
              <span>ซื้อทันที</span>
            </button>
          )}
        </div>

        {/* Smart contract badge footer */}
        <div style={{
          marginTop: 16,
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-dim)'
        }}>
          FUKU Smart Contract: 0xEA295B3a4b4049461515EF523809126Ea4cbB6B6 (BSC Testnet)
        </div>
      </div>
    </div>
  );
}

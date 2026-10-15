import React, { useState, useEffect } from 'react';
import { 
  Search, BookOpen, Sparkles, Zap, Shield, Swords, Heart, 
  Compass, Plus, ExternalLink, X, Info, Activity, ArrowUpDown, 
  Flame, Award, ShoppingBag, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers
} from 'lucide-react';
import { TYPE_COLORS, RARITY_STYLES } from '../utils/typeColors';

const ALL_TYPES = [
  'ทั้งหมด', 'normal', 'fire', 'water', 'grass', 'electric', 
  'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 
  'bug', 'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy'
];

const GENERATIONS = [
  { id: 'all', label: 'ทุกเจน (All)', range: null },
  { id: 'gen1', label: 'Gen 1: คันโต (#1-151)', range: [1, 151] },
  { id: 'gen2', label: 'Gen 2: โจโต (#152-251)', range: [152, 251] },
  { id: 'gen3', label: 'Gen 3: โฮเอ็น (#252-386)', range: [252, 386] },
  { id: 'gen4', label: 'Gen 4: ชินโอ (#387-493)', range: [387, 493] },
  { id: 'gen5', label: 'Gen 5: อุนโนวา (#494-649)', range: [494, 649] },
  { id: 'gen6', label: 'Gen 6: คาลอส (#650-721)', range: [650, 721] },
  { id: 'gen7', label: 'Gen 7: อโลลา (#722-809)', range: [722, 809] },
  { id: 'gen8', label: 'Gen 8: กาลาร์ (#810-905)', range: [810, 905] },
  { id: 'gen9', label: 'Gen 9: พัลเดีย (#906-1025)', range: [906, 1025] }
];

export default function PokedexPage({ onNavigateToAuction }) {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAll, setTotalAll] = useState(0);
  const [totalMatching, setTotalMatching] = useState(0);
  const [summary, setSummary] = useState({ rarityCounts: {}, typeCounts: {} });

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedRarity, setSelectedRarity] = useState('ทั้งหมด');
  const [selectedGen, setSelectedGen] = useState('all');
  const [sortBy, setSortBy] = useState('id'); // 'id' | 'name' | 'bst' | 'attack' | 'hp' | 'speed'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected for Details Modal
  const [detailPokemon, setDetailPokemon] = useState(null);

  // Discover new Pokémon state
  const [discoverInput, setDiscoverInput] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverMsg, setDiscoverMsg] = useState(null);

  // Debounce search input for ultra-smooth responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedType, selectedRarity, selectedGen, sortBy, sortOrder]);

  useEffect(() => {
    fetchPokemons();
  }, [debouncedSearch, selectedType, selectedRarity, selectedGen, sortBy, sortOrder, page]);

  const fetchPokemons = async () => {
    setLoading(true);
    try {
      let url = `/api/pokemons?sortBy=${sortBy}&order=${sortOrder}&page=${page}&limit=48`;
      if (debouncedSearch.trim()) url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      if (selectedType !== 'ทั้งหมด') url += `&type=${selectedType}`;
      if (selectedRarity !== 'ทั้งหมด') url += `&rarity=${selectedRarity}`;

      const genObj = GENERATIONS.find(g => g.id === selectedGen);
      if (genObj?.range) {
        url += `&genMin=${genObj.range[0]}&genMax=${genObj.range[1]}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setPokemons(data.pokemons || []);
      setTotalAll(data.totalAll || 0);
      setTotalMatching(data.totalMatching || 0);
      setTotalPages(data.totalPages || 1);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching Pokédex:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (e) => {
    e.preventDefault();
    if (!discoverInput.trim()) return;

    setDiscoverLoading(true);
    setDiscoverMsg(null);
    try {
      const res = await fetch('/api/pokemons/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: discoverInput.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        setDiscoverMsg({ type: 'success', text: data.message });
        setDiscoverInput('');
        fetchPokemons();
        if (data.pokemon) setDetailPokemon(data.pokemon);
      } else {
        setDiscoverMsg({ type: 'error', text: data.error || 'ไม่พบโปเกมอนนี้' });
      }
    } catch (err) {
      setDiscoverMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการค้นหาจาก PokéAPI' });
    } finally {
      setDiscoverLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* 1. Header Banner & Stats Overview */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 24, 45, 0.95) 0%, rgba(13, 17, 34, 0.95) 100%)',
        border: '1px solid var(--border-glass)',
        borderRadius: 24,
        padding: '36px 40px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
      }}>
        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                padding: '10px',
                borderRadius: 14,
                display: 'flex',
                boxShadow: '0 0 20px rgba(0,210,255,0.4)'
              }}>
                <BookOpen size={28} color="#fff" />
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0 }}>
                สารานุกรมโปเกมอน (Pokédex Directory)
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 650 }}>
              สำรวจรายชื่อและสถิติของโปเกมอนทั้งหมดที่ลงทะเบียนในระบบ ค้นพบสายพันธุ์ระดับตำนาน และนำเข้าโปเกมอนตัวใหม่จากฐานข้อมูล PokéAPI ระดับโลกกว่า 1,025 ตัว
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-glass)',
            padding: '16px 24px',
            borderRadius: 18
          }}>
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>ลงทะเบียนแล้ว</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-cyan)' }}>{totalAll} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ตัว</span></div>
            </div>
            <div style={{ width: 1, background: 'var(--border-glass)' }} />
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: '0.75rem', color: '#f1c40f', fontWeight: 700 }}>Legendary</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{summary.rarityCounts?.Legendary || 0}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: '0.75rem', color: '#9b59b6', fontWeight: 700 }}>Epic</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{summary.rarityCounts?.Epic || 0}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: '0.75rem', color: '#3498db', fontWeight: 700 }}>Rare</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{summary.rarityCounts?.Rare || 0}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: '0.75rem', color: '#95a5a6', fontWeight: 700 }}>Common</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{summary.rarityCounts?.Common || 0}</div>
            </div>
          </div>
        </div>

        {/* 2. Discover from PokéAPI Search Box */}
        <div style={{
          marginTop: 28,
          padding: '18px 22px',
          background: 'rgba(0, 210, 255, 0.05)',
          border: '1px dashed rgba(0, 210, 255, 0.3)',
          borderRadius: 16
        }}>
          <form onSubmit={handleDiscover} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.9rem' }}>
              <Compass size={18} />
              <span>ค้นพบโปเกมอนตัวใหม่จาก PokéAPI:</span>
            </div>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <input
                type="text"
                placeholder="ระบุชื่อหรือเลข ID เช่น Greninja, Mew, Zacian, #151..."
                value={discoverInput}
                onChange={e => setDiscoverInput(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(9, 12, 21, 0.8)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={discoverLoading || !discoverInput.trim()}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            >
              {discoverLoading ? (
                <span>กำลังดึงข้อมูลจาก PokéAPI...</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>ค้นพบ & นำเข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {discoverMsg && (
            <div style={{
              marginTop: 12,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: discoverMsg.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
              border: discoverMsg.type === 'success' ? '1px solid #2ed573' : '1px solid #ff4757',
              color: discoverMsg.type === 'success' ? '#2ed573' : '#ff4757'
            }}>
              {discoverMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{discoverMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div style={{
        background: 'rgba(16, 20, 36, 0.7)',
        border: '1px solid var(--border-glass)',
        borderRadius: 20,
        padding: '20px 24px',
        marginBottom: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="ค้นหาโปเกมอนในระบบตามชื่อ หรือ หมายเลข ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: 12,
                border: '1px solid var(--border-glass)',
                background: 'rgba(9, 12, 21, 0.7)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Rarity Selector */}
          <div style={{ minWidth: 160 }}>
            <select
              value={selectedRarity}
              onChange={e => setSelectedRarity(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--border-glass)',
                background: 'rgba(9, 12, 21, 0.7)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="ทั้งหมด">ความหายาก: ทั้งหมด</option>
              <option value="Legendary">Legendary (ตำนาน)</option>
              <option value="Epic">Epic (มหากาพย์)</option>
              <option value="Rare">Rare (หายาก)</option>
              <option value="Common">Common (ทั่วไป)</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div style={{ minWidth: 180 }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--border-glass)',
                background: 'rgba(9, 12, 21, 0.7)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="id">เรียงตาม: หมายเลข Pokédex</option>
              <option value="bst">เรียงตาม: ค่าพลังรวม (BST)</option>
              <option value="attack">เรียงตาม: พลังโจมตี (Attack)</option>
              <option value="speed">เรียงตาม: ความเร็ว (Speed)</option>
              <option value="hp">เรียงตาม: พลังชีวิต (HP)</option>
              <option value="name">เรียงตาม: ชื่อ (A - Z)</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="btn"
            style={{
              padding: '11px 16px',
              borderRadius: 12,
              border: '1px solid var(--border-glass)',
              background: 'rgba(9, 12, 21, 0.7)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title="สลับลำดับ มาก-น้อย / น้อย-มาก"
          >
            <ArrowUpDown size={16} />
            <span>{sortOrder === 'asc' ? 'น้อย -> มาก' : 'มาก -> น้อย'}</span>
          </button>
        </div>

        {/* Generation Filter Pills */}
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="var(--accent-cyan)" />
            <span>กรองตามเจเนอเรชัน (Generation 1 - 9):</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GENERATIONS.map(g => {
              const isSelected = selectedGen === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGen(g.id)}
                  style={{
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    borderRadius: 10,
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 10px rgba(0, 210, 255, 0.25)' : 'none'
                  }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type Filter Pills */}
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>
            กรองตามธาตุ (Elemental Type):
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_TYPES.map(t => {
              const isSelected = selectedType === t;
              const conf = TYPE_COLORS[t] || { bg: '#2f3542', text: '#fff' };
              const typeCount = t === 'ทั้งหมด' ? totalAll : (summary.typeCounts?.[t] || 0);

              return (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  style={{
                    border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected ? conf.bg : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? (conf.text || '#fff') : 'var(--text-muted)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize',
                    boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
                  }}
                >
                  {t} ({typeCount})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Results Header & Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
          พบโปเกมอนตรงตามเงื่อนไข <b style={{ color: 'var(--accent-cyan)' }}>{totalMatching}</b> ตัว (หน้า {page} / {totalPages}) จากทั้งหมด {totalAll} ตัวในระบบ
        </div>
        {(search || selectedType !== 'ทั้งหมด' || selectedRarity !== 'ทั้งหมด' || selectedGen !== 'all') && (
          <button
            onClick={() => { setSearch(''); setSelectedType('ทั้งหมด'); setSelectedRarity('ทั้งหมด'); setSelectedGen('all'); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>

      {/* 5. Pokémon Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Activity size={36} style={{ animation: 'spin 1.5s linear infinite', marginBottom: 12, color: 'var(--accent-cyan)' }} />
          <div>กำลังโหลดข้อมูลสารานุกรมโปเกมอน...</div>
        </div>
      ) : pokemons.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'rgba(16, 20, 36, 0.4)',
          borderRadius: 20,
          border: '1px dashed var(--border-glass)'
        }}>
          <Compass size={48} style={{ color: 'var(--text-dim)', marginBottom: 16 }} />
          <h3>ไม่พบโปเกมอนที่ตรงกับเงื่อนไขการค้นหา</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 450, margin: '8px auto 20px' }}>
            คุณสามารถใช้แถบด้านบนเพื่อค้นพบและนำเข้าโปเกมอนตัวใหม่จาก PokéAPI เข้าสู่ระบบได้ทันที!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24
        }}>
          {pokemons.map(p => {
            const rarityStyle = RARITY_STYLES[p.rarity] || RARITY_STYLES.Common;
            const primaryType = p.types[0] ? p.types[0].toLowerCase() : 'normal';
            const primaryConf = TYPE_COLORS[primaryType] || { bg: '#444' };
            const bst = p.base_stats?.bst || 400;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 26, 45, 0.85) 0%, rgba(13, 18, 35, 0.95) 100%)',
                  border: `1px solid ${rarityStyle.border}`,
                  borderRadius: 20,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: rarityStyle.glow !== 'none' ? rarityStyle.glow : '0 10px 25px rgba(0,0,0,0.4)'
                }}
              >
                {/* Background Ambient Aura */}
                <div style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: primaryConf.bg,
                  opacity: 0.15,
                  filter: 'blur(35px)',
                  pointerEvents: 'none'
                }} />

                {/* Card Top: Dex # & Rarity Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: 'var(--text-dim)',
                    fontFamily: 'monospace',
                    letterSpacing: 1
                  }}>
                    #{String(p.pokeapi_id).padStart(4, '0')}
                  </span>
                  <span className="badge" style={{ color: rarityStyle.color, background: rarityStyle.bg, border: `1px solid ${rarityStyle.border}`, fontSize: '0.72rem' }}>
                    <Sparkles size={11} />
                    {p.rarity}
                  </span>
                </div>

                {/* Pokemon Artwork */}
                <div 
                  onClick={() => setDetailPokemon(p)}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 150,
                    cursor: 'pointer',
                    position: 'relative',
                    marginBottom: 12
                  }}
                >
                  <img
                    src={p.artwork_url || p.sprite_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="floating-pokemon"
                    style={{
                      maxHeight: 140,
                      maxWidth: 160,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 8px 15px rgba(0,0,0,0.6))'
                    }}
                  />
                </div>

                {/* Name & Types */}
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <h3 
                    onClick={() => setDetailPokemon(p)}
                    style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', cursor: 'pointer' }}
                  >
                    {p.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {p.types.map(t => {
                      const c = TYPE_COLORS[t.toLowerCase()] || { bg: '#444', text: '#fff' };
                      return (
                        <span key={t} className="badge" style={{ background: c.bg, color: c.text, fontSize: '0.72rem', padding: '2px 8px' }}>
                          {t}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Mini Base Stats Preview */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 14,
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Base Stat Total:</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>{bst}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, color: 'var(--text-muted)' }}>
                    <div>HP: <b style={{ color: '#fff' }}>{p.base_stats?.hp || 50}</b></div>
                    <div>ATK: <b style={{ color: '#fff' }}>{p.base_stats?.attack || 50}</b></div>
                    <div>SPD: <b style={{ color: '#fff' }}>{p.base_stats?.speed || 50}</b></div>
                  </div>
                </div>

                {/* Market info & Details button */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <span>
                      {p.active_auctions_count > 0 ? (
                        <span style={{ color: '#f39c12', fontWeight: 700 }}>เปิดประมูล {p.active_auctions_count} รายการ</span>
                      ) : (
                        <span>ยังไม่มีในตลาด</span>
                      )}
                    </span>
                    <span>
                      {p.total_owned_count > 0 ? (
                        <span>มีเทรนเนอร์ครอง {p.total_owned_count} ตัว</span>
                      ) : (
                        <span>ยังไม่มีผู้ถือครอง</span>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setDetailPokemon(p)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                    >
                      <Info size={14} />
                      <span>ข้อมูลสกิล</span>
                    </button>

                    {onNavigateToAuction && (
                      <button
                        onClick={() => onNavigateToAuction(p.name)}
                        className="btn btn-primary"
                        style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="ค้นหาในตลาดประมูล"
                      >
                        <ShoppingBag size={14} />
                        <span>ตลาด</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {!loading && totalPages > 1 && (
        <div style={{
          marginTop: 36,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          background: 'rgba(16, 20, 36, 0.8)',
          border: '1px solid var(--border-glass)',
          borderRadius: 16,
          padding: '14px 20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {/* First Page */}
          <button
            onClick={() => { setPage(1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            disabled={page <= 1}
            className="btn btn-secondary"
            style={{
              padding: '8px 12px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: page <= 1 ? 0.4 : 1,
              cursor: page <= 1 ? 'not-allowed' : 'pointer'
            }}
            title="หน้าแรกสุด"
          >
            <ChevronsLeft size={16} />
            <span style={{ display: 'inline' }}>หน้าแรก</span>
          </button>

          {/* Previous Page */}
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            disabled={page <= 1}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: page <= 1 ? 0.4 : 1,
              cursor: page <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft size={16} />
            <span>ก่อนหน้า</span>
          </button>

          {/* Page Indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 8px'
          }}>
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, page + 2);

              if (start > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => { setPage(1); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--border-glass)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pages.push(<span key="dots-1" style={{ color: 'var(--text-dim)', padding: '0 4px' }}>...</span>);
                }
              }

              for (let i = start; i <= end; i++) {
                const isCurrent = i === page;
                pages.push(
                  <button
                    key={i}
                    onClick={() => { setPage(i); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: isCurrent ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                      background: isCurrent ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                      color: isCurrent ? '#000' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: isCurrent ? 900 : 600,
                      boxShadow: isCurrent ? '0 0 12px rgba(0, 210, 255, 0.4)' : 'none'
                    }}
                  >
                    {i}
                  </button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(<span key="dots-2" style={{ color: 'var(--text-dim)', padding: '0 4px' }}>...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => { setPage(totalPages); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: '1px solid var(--border-glass)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}
          </div>

          {/* Next Page */}
          <button
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            disabled={page >= totalPages}
            className="btn btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: page >= totalPages ? 0.4 : 1,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            <span>ถัดไป</span>
            <ChevronRight size={16} />
          </button>

          {/* Last Page */}
          <button
            onClick={() => { setPage(totalPages); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
            disabled={page >= totalPages}
            className="btn btn-secondary"
            style={{
              padding: '8px 12px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: page >= totalPages ? 0.4 : 1,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer'
            }}
            title="หน้าสุดท้าย"
          >
            <span style={{ display: 'inline' }}>ท้ายสุด</span>
            <ChevronsRight size={16} />
          </button>
        </div>
      )}

      {/* 6. Detail Modal (ข้อมูลเชิงลึก & Move Pool) */}
      {detailPokemon && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(24, 30, 52, 0.98) 0%, rgba(13, 17, 34, 0.98) 100%)',
            border: '1px solid var(--border-glass)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 750,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 30,
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setDetailPokemon(null)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              <div style={{
                width: 140,
                height: 140,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                border: '1px solid var(--border-glass)'
              }}>
                <img
                  src={detailPokemon.artwork_url || detailPokemon.sprite_url}
                  alt={detailPokemon.name}
                  style={{ maxHeight: 120, maxWidth: 120, objectFit: 'contain', filter: 'drop-shadow(0 6px 15px rgba(0,0,0,0.7))' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 800, fontFamily: 'monospace' }}>
                  #{String(detailPokemon.pokeapi_id).padStart(4, '0')}
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '2px 0 8px' }}>{detailPokemon.name}</h2>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {detailPokemon.types.map(t => {
                    const conf = TYPE_COLORS[t.toLowerCase()] || { bg: '#444', text: '#fff' };
                    return (
                      <span key={t} className="badge" style={{ background: conf.bg, color: conf.text, fontSize: '0.8rem', padding: '3px 10px' }}>
                        {t}
                      </span>
                    );
                  })}
                  <span className="badge" style={{ background: 'rgba(243, 156, 18, 0.15)', color: '#f39c12', border: '1px solid rgba(243, 156, 18, 0.4)' }}>
                    {detailPokemon.rarity}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ราคาประเมินเบื้องต้น: <b style={{ color: '#f39c12' }}>{parseFloat(detailPokemon.base_price || 1000).toLocaleString()} FUKU</b>
                </div>
              </div>
            </div>

            {/* Base Stats Radar / Bars */}
            <div style={{
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border-glass)',
              borderRadius: 16,
              padding: '18px 20px',
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span>ค่าพลังพื้นฐาน (Base Stats)</span>
                </h4>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  BST รวม: {detailPokemon.base_stats?.bst || 0}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'HP', val: detailPokemon.base_stats?.hp || 50, color: '#ff4757', max: 250 },
                  { label: 'Attack', val: detailPokemon.base_stats?.attack || 50, color: '#ff7f50', max: 200 },
                  { label: 'Defense', val: detailPokemon.base_stats?.defense || 50, color: '#2ed573', max: 230 },
                  { label: 'Sp. Attack', val: detailPokemon.base_stats?.special_attack || 50, color: '#1e90ff', max: 200 },
                  { label: 'Sp. Defense', val: detailPokemon.base_stats?.special_defense || 50, color: '#a55eea', max: 230 },
                  { label: 'Speed', val: detailPokemon.base_stats?.speed || 50, color: '#f1c40f', max: 200 }
                ].map(stat => (
                  <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
                    <span style={{ width: 85, color: 'var(--text-dim)', fontWeight: 600 }}>{stat.label}</span>
                    <span style={{ width: 35, textAlign: 'right', fontWeight: 800, color: '#fff' }}>{stat.val}</span>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, (stat.val / stat.max) * 100)}%`,
                        height: '100%',
                        background: stat.color,
                        borderRadius: 9999
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Move Pool List */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Swords size={16} style={{ color: '#f39c12' }} />
                <span>ท่าต่อสู้ประจำตัวจาก PokéAPI ({detailPokemon.moves?.length || 0} ท่า)</span>
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 10,
                maxHeight: 240,
                overflowY: 'auto',
                paddingRight: 6
              }}>
                {(detailPokemon.moves || []).map((m, idx) => {
                  const typeConf = TYPE_COLORS[m.type?.toLowerCase()] || { bg: '#444', text: '#fff' };
                  return (
                    <div key={idx} style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 10,
                      padding: '8px 12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <b style={{ fontSize: '0.85rem', color: '#fff' }}>{m.name}</b>
                        <span className="badge" style={{ background: typeConf.bg, color: typeConf.text, fontSize: '0.65rem', padding: '1px 6px' }}>
                          {m.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        <span>Power: <b style={{ color: '#fff' }}>{m.power || '-'}</b></span>
                        <span>Acc: <b style={{ color: '#fff' }}>{m.accuracy ? `${m.accuracy}%` : '-'}</b></span>
                        <span style={{ textTransform: 'capitalize' }}>{m.damage_class}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setDetailPokemon(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 24px' }}
              >
                ปิดหน้าต่าง
              </button>
              {onNavigateToAuction && (
                <button
                  onClick={() => {
                    const targetName = detailPokemon.name;
                    setDetailPokemon(null);
                    onNavigateToAuction(targetName);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <ShoppingBag size={16} />
                  <span>ค้นหาในตลาดประมูล</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

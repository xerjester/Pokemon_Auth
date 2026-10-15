const express = require('express');
const db = require('../config/db');
const { fetchPokemonFromAPI } = require('../services/pokeapi');

const router = express.Router();

/**
 * GET /api/pokemons
 * Retrieve all registered pokemons in the database with rich filters & stats summary
 */
router.get('/', async (req, res) => {
  try {
    const { search, type, rarity, sortBy = 'id', order = 'asc', genMin, genMax } = req.query;

    // 1. Fetch total count of all pokemons in system
    const countAllRes = await db.query('SELECT COUNT(*) FROM pokemons');
    const totalAll = parseInt(countAllRes.rows[0].count, 10);

    // 2. Build filtered query
    let query = `
      SELECT 
        p.id,
        p.pokeapi_id,
        p.name,
        p.types,
        p.base_stats,
        p.sprite_url,
        p.artwork_url,
        p.rarity,
        p.base_price,
        p.moves,
        (SELECT COUNT(*) FROM auctions a WHERE a.user_pokemon_id IN (SELECT up.id FROM user_pokemons up WHERE up.pokemon_id = p.id) AND a.status = 'ACTIVE') as active_auctions_count,
        (SELECT COUNT(*) FROM user_pokemons up WHERE up.pokemon_id = p.id) as total_owned_count
      FROM pokemons p
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const searchNum = parseInt(search.trim(), 10);
      if (!isNaN(searchNum)) {
        params.push(searchNum);
        query += ` AND (LOWER(p.name) LIKE $${params.length - 1} OR p.pokeapi_id = $${params.length})`;
      } else {
        query += ` AND LOWER(p.name) LIKE $${params.length}`;
      }
    }

    if (rarity && rarity !== 'ทั้งหมด') {
      params.push(rarity);
      query += ` AND p.rarity = $${params.length}`;
    }

    if (genMin && genMax) {
      params.push(parseInt(genMin, 10));
      params.push(parseInt(genMax, 10));
      query += ` AND p.pokeapi_id >= $${params.length - 1} AND p.pokeapi_id <= $${params.length}`;
    }

    // Dynamic sorting
    let sortColumn = 'p.pokeapi_id';
    if (sortBy === 'name') sortColumn = 'p.name';
    else if (sortBy === 'rarity') sortColumn = 'p.rarity';
    else if (sortBy === 'bst') sortColumn = "COALESCE((p.base_stats->>'bst')::int, 0)";
    else if (sortBy === 'attack') sortColumn = "COALESCE((p.base_stats->>'attack')::int, 0)";
    else if (sortBy === 'hp') sortColumn = "COALESCE((p.base_stats->>'hp')::int, 0)";
    else if (sortBy === 'speed') sortColumn = "COALESCE((p.base_stats->>'speed')::int, 0)";

    const sortDirection = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    const result = await db.query(query, params);

    // Filter by type (since types is JSONB array)
    let filteredList = result.rows.map(row => ({
      ...row,
      types: Array.isArray(row.types) ? row.types : JSON.parse(row.types || '[]'),
      base_stats: typeof row.base_stats === 'object' ? row.base_stats : JSON.parse(row.base_stats || '{}'),
      moves: Array.isArray(row.moves) ? row.moves : JSON.parse(row.moves || '[]'),
      active_auctions_count: parseInt(row.active_auctions_count || 0, 10),
      total_owned_count: parseInt(row.total_owned_count || 0, 10)
    }));

    if (type && type !== 'ทั้งหมด') {
      filteredList = filteredList.filter(p => 
        p.types.some(t => t.toLowerCase() === type.toLowerCase())
      );
    }

    // 3. Compute Summary Statistics
    const allRowsRes = await db.query('SELECT rarity, types FROM pokemons');
    const rarityCounts = { Legendary: 0, Epic: 0, Rare: 0, Common: 0 };
    const typeCounts = {};

    allRowsRes.rows.forEach(r => {
      if (rarityCounts[r.rarity] !== undefined) rarityCounts[r.rarity]++;
      const types = Array.isArray(r.types) ? r.types : JSON.parse(r.types || '[]');
      types.forEach(t => {
        const key = t.toLowerCase();
        typeCounts[key] = (typeCounts[key] || 0) + 1;
      });
    });

    // 4. Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = req.query.limit === 'all' ? null : (parseInt(req.query.limit, 10) || 36);
    const totalMatching = filteredList.length;
    const totalPages = limit ? Math.ceil(totalMatching / limit) : 1;
    const paginatedList = limit 
      ? filteredList.slice((page - 1) * limit, page * limit) 
      : filteredList;

    res.json({
      pokemons: paginatedList,
      totalMatching,
      totalAll,
      page,
      limit: limit || totalMatching,
      totalPages,
      summary: {
        rarityCounts,
        typeCounts
      }
    });
  } catch (err) {
    console.error('Error fetching pokemons:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดสารานุกรมโปเกมอน' });
  }
});

/**
 * GET /api/pokemons/:id
 * Retrieve detailed info of a single pokemon
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isNumber = !isNaN(parseInt(id, 10));

    let result;
    if (isNumber) {
      result = await db.query('SELECT * FROM pokemons WHERE id = $1 OR pokeapi_id = $1', [parseInt(id, 10)]);
    } else {
      result = await db.query('SELECT * FROM pokemons WHERE LOWER(name) = $1', [id.toLowerCase()]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในระบบ' });
    }

    const p = result.rows[0];
    p.types = Array.isArray(p.types) ? p.types : JSON.parse(p.types || '[]');
    p.base_stats = typeof p.base_stats === 'object' ? p.base_stats : JSON.parse(p.base_stats || '{}');
    p.moves = Array.isArray(p.moves) ? p.moves : JSON.parse(p.moves || '[]');

    res.json({ pokemon: p });
  } catch (err) {
    console.error('Error fetching pokemon detail:', err);
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลโปเกมอนได้' });
  }
});

/**
 * POST /api/pokemons/discover
 * Discover / Import any Pokemon from PokéAPI (1 - 1025) into the database
 */
router.post('/discover', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อหรือหมายเลขโปเกมอนที่ต้องการค้นหา' });
    }

    const cleanQuery = query.trim().toLowerCase();

    // Check if already in DB
    const existing = await db.query(
      'SELECT * FROM pokemons WHERE LOWER(name) = $1 OR pokeapi_id = $2',
      [cleanQuery, !isNaN(parseInt(cleanQuery, 10)) ? parseInt(cleanQuery, 10) : -1]
    );

    if (existing.rows.length > 0) {
      const p = existing.rows[0];
      return res.json({
        message: `${p.name} มีอยู่ในสารานุกรมของระบบอยู่แล้ว!`,
        pokemon: {
          ...p,
          types: Array.isArray(p.types) ? p.types : JSON.parse(p.types || '[]'),
          base_stats: typeof p.base_stats === 'object' ? p.base_stats : JSON.parse(p.base_stats || '{}'),
          moves: Array.isArray(p.moves) ? p.moves : JSON.parse(p.moves || '[]')
        },
        isNew: false
      });
    }

    // Fetch from PokéAPI
    console.log(`🌐 Discovering new Pokémon from PokéAPI: ${cleanQuery}...`);
    const p = await fetchPokemonFromAPI(cleanQuery);

    // Insert into DB
    const insertRes = await db.query(
      `INSERT INTO pokemons (pokeapi_id, name, types, base_stats, sprite_url, artwork_url, rarity, base_price, moves)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        p.pokeapi_id,
        p.name,
        JSON.stringify(p.types),
        JSON.stringify(p.base_stats),
        p.sprite_url,
        p.artwork_url,
        p.rarity,
        p.base_price,
        JSON.stringify(p.moves)
      ]
    );

    const newPoke = insertRes.rows[0];
    newPoke.types = p.types;
    newPoke.base_stats = p.base_stats;
    newPoke.moves = p.moves;

    console.log(`✨ Successfully discovered & added ${p.name} (#${p.pokeapi_id}) to DB!`);

    res.json({
      message: `ค้นพบและเพิ่ม ${p.name} (#${p.pokeapi_id}) เข้าสู่สารานุกรมสำเร็จ!`,
      pokemon: newPoke,
      isNew: true
    });
  } catch (err) {
    console.error('Error discovering pokemon from PokéAPI:', err.message);
    res.status(404).json({ error: `ไม่พบโปเกมอน "${req.body.query}" ใน PokéAPI กรุณาตรวจสอบชื่อหรือหมายเลข ID (1 - 1025)` });
  }
});

module.exports = router;

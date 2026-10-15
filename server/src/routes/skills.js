const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fetchPokemonFromAPI, getMoveInfo } = require('../services/pokeapi');

const router = express.Router();

// Get available moves for a user's Pokemon
router.get('/moves/:userPokemonId', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT up.id, up.user_id, up.moves as equipped_moves, p.id as pokemon_id, p.pokeapi_id, p.name, p.moves as base_moves
       FROM user_pokemons up
       JOIN pokemons p ON up.pokemon_id = p.id
       WHERE up.id = $1 AND up.user_id = $2`,
      [req.params.userPokemonId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้' });
    }

    const pokemon = result.rows[0];
    let availableMoves = pokemon.base_moves || [];

    // If base_moves is empty, dynamically fetch from PokéAPI
    if (!availableMoves || availableMoves.length < 4) {
      try {
        const apiData = await fetchPokemonFromAPI(pokemon.pokeapi_id);
        availableMoves = apiData.moves || [];
        // Save to DB for future quick retrieval
        await db.query(`UPDATE pokemons SET moves = $1 WHERE id = $2`, [JSON.stringify(availableMoves), pokemon.pokemon_id]);
      } catch (e) {
        console.warn('Could not fetch additional moves from PokéAPI:', e.message);
      }
    }

    res.json({
      equippedMoves: pokemon.equipped_moves || [],
      availableMoves: availableMoves || []
    });
  } catch (err) {
    console.error('Error fetching moves:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสกิล' });
  }
});

// Equip up to 4 moves for a Pokemon
router.post('/equip', authMiddleware, async (req, res) => {
  const { userPokemonId, selectedMoves } = req.body;

  if (!userPokemonId || !Array.isArray(selectedMoves) || selectedMoves.length === 0) {
    return res.status(400).json({ error: 'กรุณาเลือกสกิลอย่างน้อย 1 ท่า' });
  }

  if (selectedMoves.length > 4) {
    return res.status(400).json({ error: 'โปเกมอนสามารถติดตั้งสกิลได้สูงสุด 4 ท่าเท่านั้น' });
  }

  try {
    const checkRes = await db.query(
      `SELECT up.*, p.moves as base_moves 
       FROM user_pokemons up
       JOIN pokemons p ON up.pokemon_id = p.id
       WHERE up.id = $1 AND up.user_id = $2`,
      [userPokemonId, req.user.id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโปเกมอนนี้ในคลังของคุณ' });
    }

    // Format and sanitize selected moves
    const validatedMoves = selectedMoves.map(m => ({
      name: m.name,
      type: (m.type || 'normal').toLowerCase(),
      power: parseInt(m.power) || 60,
      accuracy: parseInt(m.accuracy) || 100,
      pp: parseInt(m.pp) || 15,
      damage_class: m.damage_class || 'physical',
      description: m.description || ''
    }));

    await db.query(
      `UPDATE user_pokemons SET moves = $1 WHERE id = $2`,
      [JSON.stringify(validatedMoves), userPokemonId]
    );

    res.json({
      message: 'ติดตั้งสกิลสำเร็จเรียบร้อย!',
      moves: validatedMoves
    });
  } catch (err) {
    console.error('Equip skills error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการติดตั้งสกิล' });
  }
});

module.exports = router;

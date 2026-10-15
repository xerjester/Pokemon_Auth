const db = require('../config/db');
const { fetchPokemonFromAPI } = require('./pokeapi');
const { BOT_TRAINERS, pushActivity } = require('./botSimulation');

// Pool of high-value Pokémon IDs for 5-minute Flash Auctions (Rare, Epic, Legendary)
const FLASH_POKEMON_IDS = [
  150, // Mewtwo (Legendary)
  384, // Rayquaza (Legendary)
  382, // Kyogre (Legendary)
  383, // Groudon (Legendary)
  487, // Giratina (Legendary)
  483, // Dialga (Legendary)
  484, // Palkia (Legendary)
  491, // Darkrai (Mythical)
  448, // Lucario (Epic)
  445, // Garchomp (Epic)
  149, // Dragonite (Legendary)
  248, // Tyranitar (Legendary)
  94,  // Gengar (Rare)
  6    // Charizard (Epic)
];

/**
 * Settle expired Flash Auctions
 */
async function settleExpiredFlashAuctions() {
  try {
    const expiredFlash = await db.query(`
      SELECT a.*, 
        COALESCE(p.name, i.name) as reward_name, 
        COALESCE(p.rarity, i.rarity) as rarity, 
        u_bidder.username as winner_name
      FROM auctions a
      LEFT JOIN user_pokemons up ON a.user_pokemon_id = up.id
      LEFT JOIN pokemons p ON up.pokemon_id = p.id
      LEFT JOIN items i ON a.item_id = i.id
      LEFT JOIN users u_bidder ON a.highest_bidder_id = u_bidder.id
      WHERE a.auction_type IN ('FLASH_SYSTEM', 'FLASH_POKEMON', 'FLASH_ITEM') 
        AND a.status = 'ACTIVE' 
        AND a.end_time <= CURRENT_TIMESTAMP
    `);

    for (const auc of expiredFlash.rows) {
      if (auc.highest_bidder_id) {
        if (auc.user_pokemon_id) {
          // Transfer Pokemon to winner
          await db.query(`
            UPDATE user_pokemons 
            SET user_id = $1, is_for_sale = FALSE, is_in_team = FALSE, team_position = NULL 
            WHERE id = $2
          `, [auc.highest_bidder_id, auc.user_pokemon_id]);
        } else if (auc.item_id) {
          // Transfer Item to winner
          await db.query(`
            INSERT INTO user_items (user_id, item_id, quantity)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_items.quantity + 1
          `, [auc.highest_bidder_id, auc.item_id]);
        }

        await db.query(`UPDATE auctions SET status = 'COMPLETED' WHERE id = $1`, [auc.id]);

        const categoryTag = auc.user_pokemon_id ? 'โปเกมอนสายฟ้า' : 'ไอเท็มสายฟ้า';
        pushActivity(
          'win_auction',
          auc.winner_name,
          'https://play.pokemonshowdown.com/sprites/trainers/red.png',
          `🎉 ชนะการประมูล${categoryTag} 5 นาที! ได้รับ ${auc.reward_name} (${auc.rarity}) เข้าสู่คลังเรียบร้อย!`
        );
      } else {
        // No bids placed
        await db.query(`UPDATE auctions SET status = 'CANCELLED' WHERE id = $1`, [auc.id]);
      }
    }
  } catch (err) {
    console.error('Error settling expired flash auctions:', err.message);
  }
}

/**
 * Ensure active Flash Pokémon Auction exists
 */
async function ensureActiveFlashPokemonAuction() {
  try {
    const active = await db.query(`
      SELECT id FROM auctions 
      WHERE (auction_type = 'FLASH_POKEMON' OR (auction_type = 'FLASH_SYSTEM' AND user_pokemon_id IS NOT NULL))
        AND status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP
    `);

    if (active.rows.length === 0) {
      await spawnNewFlashPokemonAuction();
    }
  } catch (err) {
    console.error('Error in ensureActiveFlashPokemonAuction:', err.message);
  }
}

/**
 * Ensure active Flash Item Auction exists
 */
async function ensureActiveFlashItemAuction() {
  try {
    const active = await db.query(`
      SELECT id FROM auctions 
      WHERE (auction_type = 'FLASH_ITEM' OR (auction_type = 'FLASH_SYSTEM' AND item_id IS NOT NULL))
        AND status = 'ACTIVE' AND end_time > CURRENT_TIMESTAMP
    `);

    if (active.rows.length === 0) {
      await spawnNewFlashItemAuction();
    }
  } catch (err) {
    console.error('Error in ensureActiveFlashItemAuction:', err.message);
  }
}

/**
 * Spawn a new Flash Pokémon Auction lasting 5 minutes
 */
async function spawnNewFlashPokemonAuction() {
  try {
    const sysUserRes = await db.query("SELECT id FROM users WHERE username = 'system_auction_house'");
    if (sysUserRes.rows.length === 0) return;
    const systemUserId = sysUserRes.rows[0].id;

    const randomPokeId = FLASH_POKEMON_IDS[Math.floor(Math.random() * FLASH_POKEMON_IDS.length)];

    let pokeRow = await db.query('SELECT * FROM pokemons WHERE pokeapi_id = $1', [randomPokeId]);
    if (pokeRow.rows.length === 0) {
      const p = await fetchPokemonFromAPI(randomPokeId);
      pokeRow = await db.query(
        `INSERT INTO pokemons (pokeapi_id, name, types, base_stats, sprite_url, artwork_url, rarity, base_price, moves)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [p.pokeapi_id, p.name, JSON.stringify(p.types), JSON.stringify(p.base_stats), p.sprite_url, p.artwork_url, p.rarity, p.base_price, JSON.stringify(p.moves)]
      );
    }

    const pokemon = pokeRow.rows[0];
    const maxHp = (pokemon.base_stats.hp || 50) * 3;
    const initialMoves = (pokemon.moves || []).slice(0, 4);

    const upRes = await db.query(
      `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_for_sale)
       VALUES ($1, $2, $3, 50, $4, $5, $6, $7, TRUE)
       RETURNING id`,
      [systemUserId, pokemon.id, pokemon.name, maxHp, maxHp, JSON.stringify(pokemon.base_stats), JSON.stringify(initialMoves)]
    );

    const userPokemonId = upRes.rows[0].id;
    const startBid = Math.round(parseFloat(pokemon.base_price) * 0.8);
    const buyoutPrice = Math.round(parseFloat(pokemon.base_price) * 2.5);
    const endTime = new Date(Date.now() + 5 * 60 * 1000);

    const aucRes = await db.query(
      `INSERT INTO auctions (user_pokemon_id, seller_id, start_bid, current_bid, buyout_price, end_time, status, auction_type)
       VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE', 'FLASH_POKEMON')
       RETURNING *`,
      [userPokemonId, systemUserId, startBid, buyoutPrice, endTime]
    );

    pushActivity(
      'auction_created',
      'PokéMart Auction House',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      `⚡ การประมูลโปเกมอนสายฟ้า 5 นาทีเริ่มขึ้นแล้ว! สุ่มพบโปเกมอนระดับ [${pokemon.rarity}] ${pokemon.name} เริ่มต้นที่ ${startBid.toLocaleString()} FUKU!`,
      { auctionId: aucRes.rows[0].id, pokemon: pokemon.name, rarity: pokemon.rarity }
    );

    console.log(`⚡ New 5-Minute Flash Pokemon Auction spawned: ${pokemon.name} (${pokemon.rarity}) starting at ${startBid} FUKU`);
  } catch (err) {
    console.error('Error spawning flash pokemon auction:', err.message);
  }
}

/**
 * Spawn a new Flash Item Auction lasting 5 minutes
 */
async function spawnNewFlashItemAuction() {
  try {
    const sysUserRes = await db.query("SELECT id FROM users WHERE username = 'system_auction_house'");
    if (sysUserRes.rows.length === 0) return;
    const systemUserId = sysUserRes.rows[0].id;

    const itemRes = await db.query(`
      SELECT * FROM items 
      WHERE is_flash_auction = TRUE 
      ORDER BY RANDOM() LIMIT 1
    `);

    if (itemRes.rows.length > 0) {
      const item = itemRes.rows[0];
      const startBid = Math.round(parseFloat(item.price_fuku) * 0.7);
      const buyoutPrice = Math.round(parseFloat(item.price_fuku) * 2.2);
      const endTime = new Date(Date.now() + 5 * 60 * 1000);

      const aucRes = await db.query(
        `INSERT INTO auctions (item_id, seller_id, start_bid, current_bid, buyout_price, end_time, status, auction_type)
         VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE', 'FLASH_ITEM')
         RETURNING *`,
        [item.id, systemUserId, startBid, buyoutPrice, endTime]
      );

      pushActivity(
        'auction_created',
        'PokéMart Auction House',
        item.icon_url,
        `⚡ การประมูลไอเท็มสายฟ้า 5 นาทีเริ่มขึ้นแล้ว! สุ่มพบไอเท็มพิเศษ [${item.rarity}] ${item.name} เริ่มต้นที่ ${startBid.toLocaleString()} FUKU!`,
        { auctionId: aucRes.rows[0].id, item: item.name, rarity: item.rarity }
      );

      console.log(`⚡ New 5-Minute Flash Item Auction spawned: ${item.name} (${item.rarity}) starting at ${startBid} FUKU`);
    }
  } catch (err) {
    console.error('Error spawning flash item auction:', err.message);
  }
}

/**
 * Ensure both Flash Pokémon and Flash Item auctions are active concurrently
 */
async function ensureActiveFlashAuction() {
  await settleExpiredFlashAuctions();
  await ensureActiveFlashPokemonAuction();
  await ensureActiveFlashItemAuction();
}

/**
 * Autonomous bot bidding on both Flash auctions
 */
async function triggerFlashAuctionBotBidding() {
  try {
    const flashRes = await db.query(`
      SELECT a.*, 
        COALESCE(p.name, i.name) as reward_name, 
        COALESCE(p.rarity, i.rarity) as rarity, 
        u.username as highest_bidder_name
      FROM auctions a
      LEFT JOIN user_pokemons up ON a.user_pokemon_id = up.id
      LEFT JOIN pokemons p ON up.pokemon_id = p.id
      LEFT JOIN items i ON a.item_id = i.id
      LEFT JOIN users u ON a.highest_bidder_id = u.id
      WHERE a.auction_type IN ('FLASH_SYSTEM', 'FLASH_POKEMON', 'FLASH_ITEM') 
        AND a.status = 'ACTIVE' 
        AND a.end_time > CURRENT_TIMESTAMP
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (flashRes.rows.length === 0) return;
    const flash = flashRes.rows[0];

    // Pick a random bot to bid
    const randomBot = BOT_TRAINERS[Math.floor(Math.random() * BOT_TRAINERS.length)];
    const botUserRes = await db.query('SELECT id, fuku_balance FROM users WHERE username = $1', [randomBot.username]);
    if (botUserRes.rows.length === 0) return;
    const botUser = botUserRes.rows[0];

    // If bot is already highest bidder, skip
    if (flash.highest_bidder_id === botUser.id) return;

    // Minimum required bid increment
    const increment = Math.max(200, Math.round(parseFloat(flash.current_bid) * 0.05));
    const newBid = parseFloat(flash.current_bid) + increment;

    if (parseFloat(botUser.fuku_balance) >= newBid) {
      // Refund previous highest bidder
      if (flash.highest_bidder_id) {
        await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [flash.current_bid, flash.highest_bidder_id]);
      }
      // Deduct bot balance
      await db.query('UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2', [newBid, botUser.id]);
      // Insert bid
      await db.query('INSERT INTO bids (auction_id, bidder_id, amount) VALUES ($1, $2, $3)', [flash.id, botUser.id, newBid]);
      // Update auction
      await db.query('UPDATE auctions SET current_bid = $1, highest_bidder_id = $2 WHERE id = $3', [newBid, botUser.id, flash.id]);

      const tag = flash.user_pokemon_id ? 'Flash Pokémon' : 'Flash Item';
      pushActivity(
        'bid',
        randomBot.username,
        randomBot.avatar,
        `⚡ บิดสู้ใน ${tag}! เสนอ ${newBid.toLocaleString()} FUKU ให้กับ ${flash.reward_name} (${flash.rarity})!`,
        { auctionId: flash.id, amount: newBid, target: flash.reward_name }
      );
    }
  } catch (err) {
    // console.warn('Flash bot bid error:', err.message);
  }
}

// Start interval loop for flash auction monitor & bot bidding
let flashTimer = null;
function startFlashAuctionWorker() {
  ensureActiveFlashAuction();

  if (!flashTimer) {
    flashTimer = setInterval(async () => {
      await ensureActiveFlashAuction();
      if (Math.random() < 0.75) {
        await triggerFlashAuctionBotBidding();
      }
    }, 10000);
    console.log('⚡ Dual 5-Minute Flash Auctions (Pokémon & Item) & Bot Bidding Worker Started!');
  }
}

module.exports = {
  ensureActiveFlashAuction,
  ensureActiveFlashPokemonAuction,
  ensureActiveFlashItemAuction,
  startFlashAuctionWorker
};

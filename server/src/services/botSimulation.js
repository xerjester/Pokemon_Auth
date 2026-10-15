const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { calculateAttack } = require('./battleEngine');
const { getTypeEffectiveness } = require('./typeChart');

// Live activity feed stored in memory (latest 30 activities)
const liveActivities = [];

function pushActivity(type, username, avatar, message, data = {}) {
  const activity = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    type, // 'bid', 'auction_created', 'pvp_challenge', 'pvp_victory', 'win_auction'
    username,
    avatar,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  liveActivities.unshift(activity);
  if (liveActivities.length > 35) {
    liveActivities.pop();
  }
}

// Initial seed activities
pushActivity('pvp_challenge', 'cynthia_sinnoh', 'https://play.pokemonshowdown.com/sprites/trainers/cynthia.png', 'เข้าสู่ล็อบบี้ PvP พร้อมเดิมพัน 2,000 FUKU!');
pushActivity('bid', 'steven_stone', 'https://play.pokemonshowdown.com/sprites/trainers/steven.png', 'เสนอราคา 27,500 FUKU ให้กับ Dragonite (Legendary)');
pushActivity('auction_created', 'lance_dragon', 'https://play.pokemonshowdown.com/sprites/trainers/lance.png', 'เปิดการประมูล Charizard ระดับ Epic ในราคาเริ่มต้น 8,000 FUKU');

// Bot Trainer Profiles
const BOT_TRAINERS = [
  {
    username: 'cynthia_sinnoh',
    name: 'Cynthia (แชมเปียนชินโอห์)',
    email: 'cynthia@sinnoh.league',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/cynthia.png',
    mmr: 1850,
    wager: 2000,
    title: 'Master Champion',
    team: [
      {
        name: 'Garchomp',
        nickname: 'Garchomp',
        level: 72,
        hp: 240,
        maxHp: 240,
        types: ['dragon', 'ground'],
        stats: { attack: 130, defense: 95, special_attack: 80, special_defense: 85, speed: 102 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png',
        moves: [
          { name: 'Dragon Claw', type: 'dragon', power: 80, damage_class: 'physical' },
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' },
          { name: 'Stone Edge', type: 'rock', power: 100, damage_class: 'physical' },
          { name: 'Flamethrower', type: 'fire', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Lucario',
        nickname: 'Lucario',
        level: 70,
        hp: 200,
        maxHp: 200,
        types: ['fighting', 'steel'],
        stats: { attack: 110, defense: 70, special_attack: 115, special_defense: 70, speed: 90 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png',
        moves: [
          { name: 'Close Combat', type: 'fighting', power: 120, damage_class: 'physical' },
          { name: 'Flash Cannon', type: 'steel', power: 80, damage_class: 'special' },
          { name: 'Aura Sphere', type: 'fighting', power: 80, damage_class: 'special' },
          { name: 'Dragon Pulse', type: 'dragon', power: 85, damage_class: 'special' }
        ]
      },
      {
        name: 'Milotic',
        nickname: 'Milotic',
        level: 70,
        hp: 250,
        maxHp: 250,
        types: ['water'],
        stats: { attack: 60, defense: 79, special_attack: 100, special_defense: 125, speed: 81 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/350.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/350.png',
        moves: [
          { name: 'Hydro Pump', type: 'water', power: 110, damage_class: 'special' },
          { name: 'Ice Beam', type: 'ice', power: 90, damage_class: 'special' },
          { name: 'Surf', type: 'water', power: 90, damage_class: 'special' },
          { name: 'Dragon Pulse', type: 'dragon', power: 85, damage_class: 'special' }
        ]
      }
    ]
  },
  {
    username: 'steven_stone',
    name: 'Steven (แชมเปียนโฮเอ็น)',
    email: 'steven@hoenn.league',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/steven.png',
    mmr: 1780,
    wager: 1500,
    title: 'Steel Master',
    team: [
      {
        name: 'Metagross',
        nickname: 'Metagross',
        level: 70,
        hp: 230,
        maxHp: 230,
        types: ['steel', 'psychic'],
        stats: { attack: 135, defense: 130, special_attack: 95, special_defense: 90, speed: 70 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/376.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/376.png',
        moves: [
          { name: 'Meteor Mash', type: 'steel', power: 90, damage_class: 'physical' },
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' },
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' },
          { name: 'Bullet Punch', type: 'steel', power: 40, damage_class: 'physical' }
        ]
      },
      {
        name: 'Aggron',
        nickname: 'Aggron',
        level: 68,
        hp: 220,
        maxHp: 220,
        types: ['steel', 'rock'],
        stats: { attack: 110, defense: 180, special_attack: 60, special_defense: 60, speed: 50 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/306.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/306.png',
        moves: [
          { name: 'Iron Head', type: 'steel', power: 80, damage_class: 'physical' },
          { name: 'Stone Edge', type: 'rock', power: 100, damage_class: 'physical' },
          { name: 'Body Slam', type: 'normal', power: 85, damage_class: 'physical' },
          { name: 'Thunder Punch', type: 'electric', power: 75, damage_class: 'physical' }
        ]
      },
      {
        name: 'Skarmory',
        nickname: 'Skarmory',
        level: 66,
        hp: 190,
        maxHp: 190,
        types: ['steel', 'flying'],
        stats: { attack: 80, defense: 140, special_attack: 40, special_defense: 70, speed: 70 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/227.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/227.png',
        moves: [
          { name: 'Air Slash', type: 'flying', power: 75, damage_class: 'special' },
          { name: 'Steel Wing', type: 'steel', power: 70, damage_class: 'physical' },
          { name: 'Body Slam', type: 'normal', power: 85, damage_class: 'physical' },
          { name: 'Rock Slide', type: 'rock', power: 75, damage_class: 'physical' }
        ]
      }
    ]
  },
  {
    username: 'lance_dragon',
    name: 'Lance (มาสเตอร์มังกร)',
    email: 'lance@kanto.elite',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/lance.png',
    mmr: 1720,
    wager: 1000,
    title: 'Dragon Champion',
    team: [
      {
        name: 'Dragonite',
        nickname: 'Dragonite',
        level: 68,
        hp: 235,
        maxHp: 235,
        types: ['dragon', 'flying'],
        stats: { attack: 134, defense: 95, special_attack: 100, special_defense: 100, speed: 80 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
        moves: [
          { name: 'Outrage', type: 'dragon', power: 120, damage_class: 'physical' },
          { name: 'Hyper Beam', type: 'normal', power: 150, damage_class: 'special' },
          { name: 'Fire Blast', type: 'fire', power: 110, damage_class: 'special' },
          { name: 'Thunder', type: 'electric', power: 110, damage_class: 'special' }
        ]
      },
      {
        name: 'Gyarados',
        nickname: 'Gyarados',
        level: 66,
        hp: 220,
        maxHp: 220,
        types: ['water', 'flying'],
        stats: { attack: 125, defense: 79, special_attack: 60, special_defense: 100, speed: 81 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
        moves: [
          { name: 'Hydro Pump', type: 'water', power: 110, damage_class: 'special' },
          { name: 'Dragon Claw', type: 'dragon', power: 80, damage_class: 'physical' },
          { name: 'Aqua Tail', type: 'water', power: 90, damage_class: 'physical' },
          { name: 'Ice Beam', type: 'ice', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Charizard',
        nickname: 'Charizard',
        level: 67,
        hp: 220,
        maxHp: 220,
        types: ['fire', 'flying'],
        stats: { attack: 84, defense: 78, special_attack: 109, special_defense: 85, speed: 100 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
        moves: [
          { name: 'Flamethrower', type: 'fire', power: 90, damage_class: 'special' },
          { name: 'Air Slash', type: 'flying', power: 75, damage_class: 'special' },
          { name: 'Dragon Claw', type: 'dragon', power: 80, damage_class: 'physical' },
          { name: 'Solar Beam', type: 'grass', power: 120, damage_class: 'special' }
        ]
      }
    ]
  },
  {
    username: 'blue_rival',
    name: 'Blue (คู่ปรับตลอดกาล)',
    email: 'blue@viridian.gym',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/blue.png',
    mmr: 1650,
    wager: 1000,
    title: 'Former Champion',
    team: [
      {
        name: 'Blastoise',
        nickname: 'Blastoise',
        level: 65,
        hp: 220,
        maxHp: 220,
        types: ['water'],
        stats: { attack: 83, defense: 100, special_attack: 85, special_defense: 105, speed: 78 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/9.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png',
        moves: [
          { name: 'Hydro Pump', type: 'water', power: 110, damage_class: 'special' },
          { name: 'Ice Beam', type: 'ice', power: 90, damage_class: 'special' },
          { name: 'Flash Cannon', type: 'steel', power: 80, damage_class: 'special' },
          { name: 'Body Slam', type: 'normal', power: 85, damage_class: 'physical' }
        ]
      },
      {
        name: 'Alakazam',
        nickname: 'Alakazam',
        level: 65,
        hp: 180,
        maxHp: 180,
        types: ['psychic'],
        stats: { attack: 50, defense: 45, special_attack: 135, special_defense: 95, speed: 120 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png',
        moves: [
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' },
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Energy Ball', type: 'grass', power: 90, damage_class: 'special' },
          { name: 'Focus Blast', type: 'fighting', power: 120, damage_class: 'special' }
        ]
      },
      {
        name: 'Gengar',
        nickname: 'Gengar',
        level: 64,
        hp: 185,
        maxHp: 185,
        types: ['ghost', 'poison'],
        stats: { attack: 65, defense: 60, special_attack: 130, special_defense: 75, speed: 110 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
        moves: [
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Sludge Bomb', type: 'poison', power: 90, damage_class: 'special' },
          { name: 'Thunderbolt', type: 'electric', power: 90, damage_class: 'special' },
          { name: 'Dark Pulse', type: 'dark', power: 80, damage_class: 'special' }
        ]
      }
    ]
  },
  {
    username: 'serena_kalos',
    name: 'Serena (เทรนเนอร์สาวคาลอส)',
    email: 'serena@kalos.show',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/serena.png',
    mmr: 1540,
    wager: 500,
    title: 'Showcase Star',
    team: [
      {
        name: 'Sylveon',
        nickname: 'Sylveon',
        level: 60,
        hp: 220,
        maxHp: 220,
        types: ['fairy'],
        stats: { attack: 65, defense: 65, special_attack: 110, special_defense: 130, speed: 60 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/700.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/700.png',
        moves: [
          { name: 'Moonblast', type: 'fairy', power: 95, damage_class: 'special' },
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' },
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Swift', type: 'normal', power: 60, damage_class: 'special' }
        ]
      },
      {
        name: 'Venusaur',
        nickname: 'Venusaur',
        level: 62,
        hp: 215,
        maxHp: 215,
        types: ['grass', 'poison'],
        stats: { attack: 82, defense: 83, special_attack: 100, special_defense: 100, speed: 80 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png',
        moves: [
          { name: 'Solar Beam', type: 'grass', power: 120, damage_class: 'special' },
          { name: 'Giga Drain', type: 'grass', power: 75, damage_class: 'special' },
          { name: 'Sludge Bomb', type: 'poison', power: 90, damage_class: 'special' },
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' }
        ]
      },
      {
        name: 'Pikachu',
        nickname: 'Pikachu',
        level: 60,
        hp: 170,
        maxHp: 170,
        types: ['electric'],
        stats: { attack: 85, defense: 60, special_attack: 85, special_defense: 60, speed: 110 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        moves: [
          { name: 'Thunderbolt', type: 'electric', power: 90, damage_class: 'special' },
          { name: 'Volt Tackle', type: 'electric', power: 120, damage_class: 'physical' },
          { name: 'Iron Tail', type: 'steel', power: 100, damage_class: 'physical' },
          { name: 'Quick Attack', type: 'normal', power: 40, damage_class: 'physical' }
        ]
      }
    ]
  }
];

// Initialize bots in database
async function initBotAccounts() {
  try {
    const salt = await bcrypt.genSalt(8);
    const defaultPassword = await bcrypt.hash('botpassword123', salt);

    for (const bot of BOT_TRAINERS) {
      const check = await db.query('SELECT id FROM users WHERE username = $1', [bot.username]);
      if (check.rows.length === 0) {
        const wallet = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
        await db.query(
          `INSERT INTO users (username, email, password_hash, wallet_address, fuku_balance)
           VALUES ($1, $2, $3, $4, $5)`,
          [bot.username, bot.email, defaultPassword, wallet, 150000.00]
        );
      }
    }
  } catch (err) {
    console.warn('Could not initialize bot accounts:', err.message);
  }
}

// Helper function: Trainer bot autonomously lists a Pokémon for auction
async function createBotAuction(specifiedBot = null, specifiedUser = null) {
  try {
    const bot = specifiedBot || BOT_TRAINERS[Math.floor(Math.random() * BOT_TRAINERS.length)];
    let user = specifiedUser;
    if (!user) {
      const uRes = await db.query('SELECT id, fuku_balance FROM users WHERE username = $1', [bot.username]);
      if (uRes.rows.length === 0) return null;
      user = uRes.rows[0];
    }

    // Pick a high-value or iconic Pokémon from database (favoring BST >= 480 or Rare/Epic/Legendary)
    const pokeRes = await db.query(`
      SELECT * FROM pokemons 
      WHERE rarity IN ('Rare', 'Epic', 'Legendary') OR COALESCE((base_stats->>'bst')::int, 0) >= 480
      ORDER BY RANDOM() LIMIT 1
    `);

    if (pokeRes.rows.length === 0) return null;
    const poke = pokeRes.rows[0];
    const stats = typeof poke.base_stats === 'object' ? poke.base_stats : JSON.parse(poke.base_stats || '{}');
    const moves = Array.isArray(poke.moves) ? poke.moves : JSON.parse(poke.moves || '[]');

    const level = Math.floor(Math.random() * 31) + 45; // Lv 45 - 75
    const hp = Math.floor((stats.hp || 60) * (level / 50) + 15);
    const calculatedStats = {
      hp,
      attack: Math.floor((stats.attack || 60) * (level / 50) + 10),
      defense: Math.floor((stats.defense || 60) * (level / 50) + 10),
      special_attack: Math.floor((stats.special_attack || stats.attack || 60) * (level / 50) + 10),
      special_defense: Math.floor((stats.special_defense || stats.defense || 60) * (level / 50) + 10),
      speed: Math.floor((stats.speed || 60) * (level / 50) + 10),
      bst: stats.bst || 450
    };

    // Create user_pokemons entry for this trainer
    const upRes = await db.query(
      `INSERT INTO user_pokemons (user_id, pokemon_id, nickname, level, current_hp, max_hp, stats, moves, is_for_sale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id`,
      [
        user.id,
        poke.id,
        poke.name,
        level,
        hp,
        hp,
        JSON.stringify(calculatedStats),
        JSON.stringify(moves.slice(0, 4))
      ]
    );
    const userPokemonId = upRes.rows[0].id;

    // Realistic starting price based on base_price and rarity
    const baseVal = parseFloat(poke.base_price || 3000);
    const startBid = Math.max(1500, Math.round(baseVal * (0.85 + Math.random() * 0.35) / 100) * 100);
    const buyoutPrice = Math.round(startBid * (1.8 + Math.random() * 0.6) / 100) * 100;

    // Realistic duration: 10 - 20 minutes
    const durationMinutes = Math.floor(Math.random() * 11) + 10;
    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);

    const aucRes = await db.query(
      `INSERT INTO auctions (user_pokemon_id, seller_id, start_bid, current_bid, buyout_price, status, end_time)
       VALUES ($1, $2, $3, $3, $4, 'ACTIVE', $5)
       RETURNING id`,
      [userPokemonId, user.id, startBid, buyoutPrice, endTime]
    );

    pushActivity(
      'auction_created',
      bot.username,
      bot.avatar,
      `เปิดการประมูล ${poke.name} (${poke.rarity}) เริ่มต้นที่ ${startBid.toLocaleString()} FUKU!`,
      { auctionId: aucRes.rows[0].id, pokemon: poke.name, price: startBid }
    );

    console.log(`⚡ Trainer @${bot.username} decided to list ${poke.name} (${poke.rarity}) for auction at ${startBid} FUKU!`);
    return aucRes.rows[0];
  } catch (err) {
    console.warn('Error in createBotAuction:', err.message);
    return null;
  }
}

// Autonomous Bot Activities Loop (Runs periodically)
async function runBotCycle() {
  try {
    const randomBot = BOT_TRAINERS[Math.floor(Math.random() * BOT_TRAINERS.length)];
    const userRes = await db.query('SELECT id, fuku_balance FROM users WHERE username = $1', [randomBot.username]);
    if (userRes.rows.length === 0) return;
    const botUser = userRes.rows[0];

    // Check active player auctions count
    const activeCountRes = await db.query("SELECT COUNT(*) FROM auctions WHERE status = 'ACTIVE' AND item_id IS NULL");
    const activeCount = parseInt(activeCountRes.rows[0].count, 10);

    // If market has few auctions, prioritize creating an auction!
    let actions = ['bid', 'bid', 'pvp_notice', 'new_auction'];
    if (activeCount < 4) {
      actions = ['new_auction', 'new_auction', 'bid', 'pvp_notice'];
    }

    const action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'new_auction') {
      await createBotAuction(randomBot, botUser);
    } else if (action === 'bid') {
      // Find an active auction where this bot is not highest bidder
      const aucRes = await db.query(
        `SELECT a.*, p.name as poke_name, p.rarity, u.username as current_bidder 
         FROM auctions a 
         JOIN user_pokemons up ON a.user_pokemon_id = up.id 
         JOIN pokemons p ON up.pokemon_id = p.id
         LEFT JOIN users u ON a.highest_bidder_id = u.id
         WHERE a.status = 'ACTIVE' AND a.end_time > CURRENT_TIMESTAMP AND a.seller_id != $1
         ORDER BY RANDOM() LIMIT 1`,
        [botUser.id]
      );

      if (aucRes.rows.length > 0) {
        const target = aucRes.rows[0];
        // If bot is already highest bidder, skip
        if (target.highest_bidder_id !== botUser.id) {
          const increment = Math.max(100, Math.round(parseFloat(target.current_bid) * 0.05));
          const newBid = parseFloat(target.current_bid) + increment;

          if (parseFloat(botUser.fuku_balance) >= newBid) {
            // Refund previous bidder if any
            if (target.highest_bidder_id) {
              await db.query('UPDATE users SET fuku_balance = fuku_balance + $1 WHERE id = $2', [target.current_bid, target.highest_bidder_id]);
            }
            // Deduct bot balance
            await db.query('UPDATE users SET fuku_balance = fuku_balance - $1 WHERE id = $2', [newBid, botUser.id]);
            // Record bid
            await db.query('INSERT INTO bids (auction_id, bidder_id, amount) VALUES ($1, $2, $3)', [target.id, botUser.id, newBid]);
            // Update auction
            await db.query('UPDATE auctions SET current_bid = $1, highest_bidder_id = $2 WHERE id = $3', [newBid, botUser.id, target.id]);

            pushActivity(
              'bid',
              randomBot.username,
              randomBot.avatar,
              `เสนอราคาประมูล ${newBid.toLocaleString()} FUKU ให้กับ ${target.poke_name} (${target.rarity})!`,
              { auctionId: target.id, amount: newBid, pokemon: target.poke_name }
            );
          }
        }
      }
    } else if (action === 'pvp_notice') {
      pushActivity(
        'pvp_challenge',
        randomBot.username,
        randomBot.avatar,
        `พร้อมรับคำท้าดวล 3v3 ในล็อบบี้ PvP เดิมพัน ${randomBot.wager.toLocaleString()} FUKU!`,
        { wager: randomBot.wager }
      );
    }
  } catch (err) {
    // Suppress minor background errors
  }
}

// Start simulation interval (every 20 seconds)
let simTimer = null;
function startBotSimulation() {
  initBotAccounts().then(async () => {
    // Check if initial auctions are needed to populate the market
    try {
      const activeCountRes = await db.query("SELECT COUNT(*) FROM auctions WHERE status = 'ACTIVE' AND item_id IS NULL");
      const activeCount = parseInt(activeCountRes.rows[0].count, 10);
      if (activeCount < 4) {
        console.log(`📢 Populating market with ${4 - activeCount} initial trainer auctions...`);
        for (let i = 0; i < (4 - activeCount); i++) {
          await createBotAuction();
        }
      }
    } catch (e) {
      // ignore
    }

    if (!simTimer) {
      simTimer = setInterval(runBotCycle, 20000);
      console.log('🤖 Realistic Bot Player Simulation Active!');
    }
  });
}

// Bot AI for turn move selection: picks best move based on opponent's types
function pickBotMove(botMon, defender) {
  const moves = botMon.moves;
  let bestMove = moves[0];
  let bestScore = -1;

  for (const m of moves) {
    const { multiplier } = getTypeEffectiveness(m.type, defender.types);
    const isStab = (botMon.types || []).includes(m.type?.toLowerCase()) ? 1.5 : 1.0;
    const score = (m.power || 60) * multiplier * isStab;
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  // 80% chance to pick best strategic move, 20% random
  if (Math.random() < 0.8 && bestScore > 0) {
    return bestMove;
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

module.exports = {
  BOT_TRAINERS,
  liveActivities,
  startBotSimulation,
  pushActivity,
  pickBotMove
};

const axios = require('axios');

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// In-memory cache for moves and pokemon to avoid duplicate API calls
const moveCache = new Map();
const pokemonCache = new Map();

/**
 * Standard move presets with full stats to ensure instant fast response
 */
const FALLBACK_MOVES = {
  // Fire
  'flamethrower': { name: 'Flamethrower', type: 'fire', power: 90, accuracy: 100, pp: 15, damage_class: 'special', description: 'The target is scorched with an intense blast of fire.' },
  'fire-blast': { name: 'Fire Blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damage_class: 'special', description: 'The target is attacked with an intense blast of all-consuming fire.' },
  'fire-punch': { name: 'Fire Punch', type: 'fire', power: 75, accuracy: 100, pp: 15, damage_class: 'physical', description: 'The target is punched with a fiery fist.' },
  'flare-blitz': { name: 'Flare Blitz', type: 'fire', power: 120, accuracy: 100, pp: 5, damage_class: 'physical', description: 'The user cloaks itself in fire and charges at the target.' },
  
  // Water
  'hydro-pump': { name: 'Hydro Pump', type: 'water', power: 110, accuracy: 80, pp: 5, damage_class: 'special', description: 'The target is blasted by a huge volume of water launched under great pressure.' },
  'surf': { name: 'Surf', type: 'water', power: 90, accuracy: 100, pp: 15, damage_class: 'special', description: 'The user attacks everything around it by swamping its surroundings with a giant wave.' },
  'water-pulse': { name: 'Water Pulse', type: 'water', power: 60, accuracy: 100, pp: 20, damage_class: 'special', description: 'The user attacks the target with a pulsing blast of water.' },
  'aqua-tail': { name: 'Aqua Tail', type: 'water', power: 90, accuracy: 90, pp: 10, damage_class: 'physical', description: 'The user attacks by swinging its tail as if it were a vicious wave in a raging storm.' },
  
  // Grass
  'solar-beam': { name: 'Solar Beam', type: 'grass', power: 120, accuracy: 100, pp: 10, damage_class: 'special', description: 'In this two-turn attack, the user gathers light, then blasts a bundled beam on the next turn.' },
  'energy-ball': { name: 'Energy Ball', type: 'grass', power: 90, accuracy: 100, pp: 10, damage_class: 'special', description: 'The user draws power from nature and fires it at the target.' },
  'giga-drain': { name: 'Giga Drain', type: 'grass', power: 75, accuracy: 100, pp: 10, damage_class: 'special', description: 'A nutrient-draining attack. The user\'s HP is restored by half the damage taken by the target.' },
  'leaf-blade': { name: 'Leaf Blade', type: 'grass', power: 90, accuracy: 100, pp: 15, damage_class: 'physical', description: 'The user handles a sharp leaf like a sword and attacks by cutting its target.' },
  
  // Electric
  'thunderbolt': { name: 'Thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, damage_class: 'special', description: 'A strong electric blast crashes down on the target.' },
  'thunder': { name: 'Thunder', type: 'electric', power: 110, accuracy: 70, pp: 10, damage_class: 'special', description: 'A wicked thunderbolt is dropped on the target to inflict damage.' },
  'volt-tackle': { name: 'Volt Tackle', type: 'electric', power: 120, accuracy: 100, pp: 5, damage_class: 'physical', description: 'The user electrifies itself and charges the target.' },
  'thunder-punch': { name: 'Thunder Punch', type: 'electric', power: 75, accuracy: 100, pp: 15, damage_class: 'physical', description: 'The target is punched with an electrified fist.' },

  // Psychic
  'psychic': { name: 'Psychic', type: 'psychic', power: 90, accuracy: 100, pp: 10, damage_class: 'special', description: 'The target is hit with a strong telekinetic force.' },
  'psystrike': { name: 'Psystrike', type: 'psychic', power: 100, accuracy: 100, pp: 10, damage_class: 'special', description: 'The user materializes an odd psychic wave to attack the target.' },

  // Dragon
  'dragon-claw': { name: 'Dragon Claw', type: 'dragon', power: 80, accuracy: 100, pp: 15, damage_class: 'physical', description: 'The user slashes the target with huge, sharp claws.' },
  'draco-meteor': { name: 'Draco Meteor', type: 'dragon', power: 130, accuracy: 90, pp: 5, damage_class: 'special', description: 'Comets are summoned down from the sky onto the target.' },
  'outrage': { name: 'Outrage', type: 'dragon', power: 120, accuracy: 100, pp: 10, damage_class: 'physical', description: 'The user rampages and attacks for two to three turns.' },

  // Ice
  'ice-beam': { name: 'Ice Beam', type: 'ice', power: 90, accuracy: 100, pp: 10, damage_class: 'special', description: 'The target is struck with an icy-cold beam of energy.' },
  'blizzard': { name: 'Blizzard', type: 'ice', power: 110, accuracy: 70, pp: 5, damage_class: 'special', description: 'A howling blizzard is summoned to strike the opposing Pokémon.' },

  // Fighting & Ground & Rock & Normal
  'earthquake': { name: 'Earthquake', type: 'ground', power: 100, accuracy: 100, pp: 10, damage_class: 'physical', description: 'The user sets off an earthquake that strikes every Pokémon around it.' },
  'close-combat': { name: 'Close Combat', type: 'fighting', power: 120, accuracy: 100, pp: 5, damage_class: 'physical', description: 'The user fights the target up close without guarding itself.' },
  'stone-edge': { name: 'Stone Edge', type: 'rock', power: 100, accuracy: 80, pp: 5, damage_class: 'physical', description: 'The user stabs the target from below with sharpened stones.' },
  'hyper-beam': { name: 'Hyper Beam', type: 'normal', power: 150, accuracy: 90, pp: 5, damage_class: 'special', description: 'A powerful blast is fired at the target.' },
  'body-slam': { name: 'Body Slam', type: 'normal', power: 85, accuracy: 100, pp: 15, damage_class: 'physical', description: 'The user drops onto the target with its full body weight.' },
  'shadow-ball': { name: 'Shadow Ball', type: 'ghost', power: 80, accuracy: 100, pp: 15, damage_class: 'special', description: 'The user hurls a shadowy blob at the target.' },
  'iron-tail': { name: 'Iron Tail', type: 'steel', power: 100, accuracy: 75, pp: 15, damage_class: 'physical', description: 'The target is slammed with a steel-hard tail.' },
  'moonblast': { name: 'Moonblast', type: 'fairy', power: 95, accuracy: 100, pp: 15, damage_class: 'special', description: 'Borrowing the power of the moon, the user attacks the target.' },
  'dark-pulse': { name: 'Dark Pulse', type: 'dark', power: 80, accuracy: 100, pp: 15, damage_class: 'special', description: 'The user releases a horrible aura imbued with dark thoughts.' }
};

/**
 * Fetch move information from PokéAPI or fallback
 */
async function getMoveInfo(moveName) {
  const key = moveName.toLowerCase().replace(/\s+/g, '-');
  if (moveCache.has(key)) return moveCache.get(key);

  if (FALLBACK_MOVES[key]) {
    moveCache.set(key, FALLBACK_MOVES[key]);
    return FALLBACK_MOVES[key];
  }

  try {
    const res = await axios.get(`${POKEAPI_BASE}/move/${key}`, { timeout: 4000 });
    const data = res.data;
    const move = {
      name: data.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: data.type.name,
      power: data.power || 60,
      accuracy: data.accuracy || 100,
      pp: data.pp || 15,
      damage_class: data.damage_class?.name || 'physical',
      description: data.flavor_text_entries?.find(e => e.language.name === 'en')?.flavor_text?.replace(/[\n\f]/g, ' ') || ''
    };
    moveCache.set(key, move);
    return move;
  } catch (err) {
    // Fallback default
    const fallback = {
      name: moveName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'normal',
      power: 60,
      accuracy: 100,
      pp: 15,
      damage_class: 'physical',
      description: 'A standard Pokémon attack.'
    };
    moveCache.set(key, fallback);
    return fallback;
  }
}

/**
 * Fetch Pokemon from PokeAPI by id or name
 */
async function fetchPokemonFromAPI(idOrName) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  try {
    const res = await axios.get(`${POKEAPI_BASE}/pokemon/${key}`, { timeout: 6000 });
    const data = res.data;

    const statsObj = {};
    for (const s of data.stats) {
      statsObj[s.stat.name] = s.base_stat;
    }

    const types = data.types.map(t => t.type.name);
    const sprite_url = data.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`;
    const artwork_url = data.sprites.other?.['official-artwork']?.front_default || sprite_url;

    // Available moves from PokéAPI (pick top 12 moves for variety)
    const availableMoveNames = data.moves.slice(0, 15).map(m => m.move.name);
    const moves = [];
    for (const moveName of availableMoveNames) {
      const moveData = await getMoveInfo(moveName);
      moves.push(moveData);
    }

    // Determine Rarity based on base stat total
    const bst = (statsObj.hp || 50) + (statsObj.attack || 50) + (statsObj.defense || 50) + 
                (statsObj['special-attack'] || 50) + (statsObj['special-defense'] || 50) + (statsObj.speed || 50);
    
    let rarity = 'Common';
    let basePrice = 500;
    if (bst >= 600) {
      rarity = 'Legendary';
      basePrice = 25000;
    } else if (bst >= 520) {
      rarity = 'Epic';
      basePrice = 8000;
    } else if (bst >= 420) {
      rarity = 'Rare';
      basePrice = 2500;
    }

    const parsedPokemon = {
      pokeapi_id: data.id,
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      types,
      base_stats: {
        hp: statsObj.hp || 50,
        attack: statsObj.attack || 50,
        defense: statsObj.defense || 50,
        special_attack: statsObj['special-attack'] || 50,
        special_defense: statsObj['special-defense'] || 50,
        speed: statsObj.speed || 50,
        bst
      },
      sprite_url,
      artwork_url,
      rarity,
      base_price: basePrice,
      moves
    };

    pokemonCache.set(key, parsedPokemon);
    return parsedPokemon;
  } catch (err) {
    console.error(`Error fetching Pokemon ${idOrName} from PokéAPI:`, err.message);
    throw err;
  }
}

module.exports = {
  fetchPokemonFromAPI,
  getMoveInfo,
  FALLBACK_MOVES
};

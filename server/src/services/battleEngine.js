const { getTypeEffectiveness } = require('./typeChart');

// Gym Leaders definitions with balanced Pokémon rosters
const GYM_LEADERS = {
  brock: {
    id: 'brock',
    name: 'Brock (ผู้นำยิมพิวเตอร์)',
    badge: 'Boulder Badge',
    reward: 2000,
    difficulty: 'Easy (เป็นมิตรต่อผู้เล่นใหม่)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/brock.png',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/1.png',
    hint: 'แพ้ทางธาตุน้ำ (Water) และพืช (Grass) รุนแรง 4 เท่า! ใช้ท่าประเภทน้ำหรือพืชเอาชนะได้ง่ายๆ',
    pokemon: [
      {
        name: 'Geodude',
        hp: 75,
        maxHp: 75,
        types: ['rock', 'ground'],
        stats: { attack: 65, defense: 85, special_attack: 30, special_defense: 30, speed: 20 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/74.png',
        moves: [
          { name: 'Rock Throw', type: 'rock', power: 50, damage_class: 'physical' },
          { name: 'Mud-Slap', type: 'ground', power: 40, damage_class: 'special' },
          { name: 'Tackle', type: 'normal', power: 40, damage_class: 'physical' }
        ]
      },
      {
        name: 'Onix',
        hp: 90,
        maxHp: 90,
        types: ['rock', 'ground'],
        stats: { attack: 65, defense: 105, special_attack: 30, special_defense: 45, speed: 55 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/95.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/95.png',
        moves: [
          { name: 'Rock Throw', type: 'rock', power: 50, damage_class: 'physical' },
          { name: 'Bind', type: 'normal', power: 35, damage_class: 'physical' },
          { name: 'Slam', type: 'normal', power: 60, damage_class: 'physical' }
        ]
      }
    ]
  },
  misty: {
    id: 'misty',
    name: 'Misty (ผู้นำยิมฮานาดะ)',
    badge: 'Cascade Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/2.png',
    reward: 3500,
    difficulty: 'Normal (ระดับปานกลาง)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/misty.png',
    hint: 'แพ้ทางธาตุไฟฟ้า (Electric) และพืช (Grass) 2 เท่า!',
    pokemon: [
      {
        name: 'Starmie',
        hp: 115,
        maxHp: 115,
        types: ['water', 'psychic'],
        stats: { attack: 65, defense: 75, special_attack: 85, special_defense: 75, speed: 100 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/121.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/121.png',
        moves: [
          { name: 'Water Pulse', type: 'water', power: 60, damage_class: 'special' },
          { name: 'Psybeam', type: 'psychic', power: 65, damage_class: 'special' },
          { name: 'Swift', type: 'normal', power: 60, damage_class: 'special' }
        ]
      },
      {
        name: 'Gyarados',
        hp: 130,
        maxHp: 130,
        types: ['water', 'flying'],
        stats: { attack: 105, defense: 75, special_attack: 60, special_defense: 85, speed: 75 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
        moves: [
          { name: 'Water Pulse', type: 'water', power: 60, damage_class: 'special' },
          { name: 'Bite', type: 'dark', power: 60, damage_class: 'physical' },
          { name: 'Twister', type: 'dragon', power: 40, damage_class: 'special' }
        ]
      }
    ]
  },
  ltsurge: {
    id: 'ltsurge',
    name: 'Lt. Surge (ผู้นำยิมคุจิบะ)',
    badge: 'Thunder Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/3.png',
    reward: 4000,
    difficulty: 'Normal (ระดับปานกลาง)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/ltsurge.png',
    hint: 'แพ้ทางธาตุดิน (Ground) รุนแรง 2 เท่า และโปเกมอนดินจะไม่โดนสายฟ้าช็อต!',
    pokemon: [
      {
        name: 'Voltorb',
        hp: 110,
        maxHp: 110,
        types: ['electric'],
        stats: { attack: 60, defense: 70, special_attack: 75, special_defense: 75, speed: 110 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/100.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/100.png',
        moves: [
          { name: 'Spark', type: 'electric', power: 65, damage_class: 'physical' },
          { name: 'Swift', type: 'normal', power: 60, damage_class: 'special' },
          { name: 'Sonic Boom', type: 'normal', power: 40, damage_class: 'special' }
        ]
      },
      {
        name: 'Raichu',
        hp: 140,
        maxHp: 140,
        types: ['electric'],
        stats: { attack: 90, defense: 65, special_attack: 95, special_defense: 85, speed: 110 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/26.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/26.png',
        moves: [
          { name: 'Thunderbolt', type: 'electric', power: 90, damage_class: 'special' },
          { name: 'Quick Attack', type: 'normal', power: 40, damage_class: 'physical' },
          { name: 'Iron Tail', type: 'steel', power: 100, damage_class: 'physical' }
        ]
      }
    ]
  },
  erika: {
    id: 'erika',
    name: 'Erika (ผู้นำยิมทามามุชิ)',
    badge: 'Rainbow Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/4.png',
    reward: 4500,
    difficulty: 'Normal (ระดับปานกลาง)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/erika.png',
    hint: 'แพ้ทางธาตุไฟ (Fire), น้ำแข็ง (Ice), บิน (Flying), และแมลง (Bug) 2 เท่า!',
    pokemon: [
      {
        name: 'Tangela',
        hp: 125,
        maxHp: 125,
        types: ['grass'],
        stats: { attack: 65, defense: 115, special_attack: 100, special_defense: 50, speed: 60 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/114.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/114.png',
        moves: [
          { name: 'Giga Drain', type: 'grass', power: 75, damage_class: 'special' },
          { name: 'Vine Whip', type: 'grass', power: 45, damage_class: 'physical' },
          { name: 'Slam', type: 'normal', power: 60, damage_class: 'physical' }
        ]
      },
      {
        name: 'Vileplume',
        hp: 150,
        maxHp: 150,
        types: ['grass', 'poison'],
        stats: { attack: 80, defense: 85, special_attack: 110, special_defense: 90, speed: 50 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/45.png',
        moves: [
          { name: 'Petal Dance', type: 'grass', power: 120, damage_class: 'special' },
          { name: 'Sludge Bomb', type: 'poison', power: 90, damage_class: 'special' },
          { name: 'Acid', type: 'poison', power: 40, damage_class: 'special' }
        ]
      }
    ]
  },
  koga: {
    id: 'koga',
    name: 'Koga (ผู้นำยิมเซคิจิคุ)',
    badge: 'Soul Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/5.png',
    reward: 5500,
    difficulty: 'Hard (ระดับท้าทาย)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/koga.png',
    hint: 'นินจาแห่งพิษ แพ้ทางธาตุพลังจิต (Psychic) และดิน (Ground) 2 เท่า!',
    pokemon: [
      {
        name: 'Venomoth',
        hp: 145,
        maxHp: 145,
        types: ['bug', 'poison'],
        stats: { attack: 65, defense: 60, special_attack: 90, special_defense: 75, speed: 90 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/49.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/49.png',
        moves: [
          { name: 'Bug Buzz', type: 'bug', power: 90, damage_class: 'special' },
          { name: 'Psybeam', type: 'psychic', power: 65, damage_class: 'special' },
          { name: 'Sludge Bomb', type: 'poison', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Weezing',
        hp: 165,
        maxHp: 165,
        types: ['poison'],
        stats: { attack: 90, defense: 120, special_attack: 85, special_defense: 70, speed: 60 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/110.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/110.png',
        moves: [
          { name: 'Sludge Wave', type: 'poison', power: 95, damage_class: 'special' },
          { name: 'Dark Pulse', type: 'dark', power: 80, damage_class: 'special' },
          { name: 'Smog', type: 'poison', power: 40, damage_class: 'special' }
        ]
      }
    ]
  },
  sabrina: {
    id: 'sabrina',
    name: 'Sabrina (ผู้นำยิมยามาบุกิ)',
    badge: 'Marsh Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/6.png',
    reward: 6000,
    difficulty: 'Hard (ระดับท้าทาย)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/sabrina.png',
    hint: 'จ้าวแห่งพลังจิต แพ้ทางธาตุมืด (Dark), ผี (Ghost), และแมลง (Bug)! ระวังพลังโจมตีพิเศษสูงมาก',
    pokemon: [
      {
        name: 'Mr. Mime',
        hp: 150,
        maxHp: 150,
        types: ['psychic', 'fairy'],
        stats: { attack: 55, defense: 65, special_attack: 100, special_defense: 120, speed: 90 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/122.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/122.png',
        moves: [
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' },
          { name: 'Dazzling Gleam', type: 'fairy', power: 80, damage_class: 'special' },
          { name: 'Psybeam', type: 'psychic', power: 65, damage_class: 'special' }
        ]
      },
      {
        name: 'Alakazam',
        hp: 170,
        maxHp: 170,
        types: ['psychic'],
        stats: { attack: 55, defense: 55, special_attack: 135, special_defense: 95, speed: 120 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png',
        moves: [
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' },
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Energy Ball', type: 'grass', power: 90, damage_class: 'special' }
        ]
      }
    ]
  },
  blaine: {
    id: 'blaine',
    name: 'Blaine (ผู้นำยิมกุเรน)',
    badge: 'Volcano Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/7.png',
    reward: 6500,
    difficulty: 'Hard (ระดับท้าทาย)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/blaine.png',
    hint: 'แพ้ทางธาตุน้ำ (Water), ดิน (Ground), และหิน (Rock) 2 เท่า!',
    pokemon: [
      {
        name: 'Magmar',
        hp: 160,
        maxHp: 160,
        types: ['fire'],
        stats: { attack: 95, defense: 65, special_attack: 100, special_defense: 85, speed: 90 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/126.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/126.png',
        moves: [
          { name: 'Fire Punch', type: 'fire', power: 75, damage_class: 'physical' },
          { name: 'Thunder Punch', type: 'electric', power: 75, damage_class: 'physical' },
          { name: 'Smog', type: 'poison', power: 30, damage_class: 'special' }
        ]
      },
      {
        name: 'Arcanine',
        hp: 180,
        maxHp: 180,
        types: ['fire'],
        stats: { attack: 110, defense: 80, special_attack: 100, special_defense: 80, speed: 95 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/59.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/59.png',
        moves: [
          { name: 'Flamethrower', type: 'fire', power: 90, damage_class: 'special' },
          { name: 'Extreme Speed', type: 'normal', power: 80, damage_class: 'physical' },
          { name: 'Crunch', type: 'dark', power: 80, damage_class: 'physical' }
        ]
      }
    ]
  },
  giovanni: {
    id: 'giovanni',
    name: 'Giovanni (ผู้นำยิมโทคิวะ / บอสใหญ่แก๊งร็อคเก็ต)',
    badge: 'Earth Badge',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/8.png',
    reward: 8500,
    difficulty: 'Expert (ระดับเชี่ยวชาญ)',
    region: 'kanto',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/giovanni.png',
    hint: 'ผู้บงการแก๊งร็อคเก็ต แพ้ทางธาตุน้ำ (Water), พืช (Grass), และน้ำแข็ง (Ice)! พลังกายภาพสูงมาก',
    pokemon: [
      {
        name: 'Nidoqueen',
        hp: 170,
        maxHp: 170,
        types: ['poison', 'ground'],
        stats: { attack: 92, defense: 87, special_attack: 75, special_defense: 85, speed: 76 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/31.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/31.png',
        moves: [
          { name: 'Earth Power', type: 'ground', power: 90, damage_class: 'special' },
          { name: 'Sludge Wave', type: 'poison', power: 95, damage_class: 'special' },
          { name: 'Ice Beam', type: 'ice', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Nidoking',
        hp: 180,
        maxHp: 180,
        types: ['poison', 'ground'],
        stats: { attack: 102, defense: 77, special_attack: 85, special_defense: 75, speed: 85 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/34.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/34.png',
        moves: [
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' },
          { name: 'Poison Jab', type: 'poison', power: 80, damage_class: 'physical' },
          { name: 'Megahorn', type: 'bug', power: 120, damage_class: 'physical' }
        ]
      },
      {
        name: 'Rhydon',
        hp: 195,
        maxHp: 195,
        types: ['ground', 'rock'],
        stats: { attack: 130, defense: 120, special_attack: 45, special_defense: 45, speed: 40 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/112.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/112.png',
        moves: [
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' },
          { name: 'Stone Edge', type: 'rock', power: 100, damage_class: 'physical' },
          { name: 'Hammer Arm', type: 'fighting', power: 100, damage_class: 'physical' }
        ]
      }
    ]
  },
  lance: {
    id: 'lance',
    name: 'Lance (จตุรเทพดรากอนมาสเตอร์)',
    badge: 'Dragon Crest',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dragon-scale.png',
    reward: 10000,
    difficulty: 'Master (ระดับมาสเตอร์)',
    region: 'champions',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/lance.png',
    hint: 'มังกรแพ้ทางน้ำแข็ง (Ice) รุนแรงถึง 4 เท่า! และแพ้ทางแฟรี่ (Fairy) กับมังกร (Dragon)',
    pokemon: [
      {
        name: 'Gyarados',
        hp: 175,
        maxHp: 175,
        types: ['water', 'flying'],
        stats: { attack: 125, defense: 79, special_attack: 60, special_defense: 100, speed: 81 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/130.png',
        moves: [
          { name: 'Hydro Pump', type: 'water', power: 110, damage_class: 'special' },
          { name: 'Dragon Pulse', type: 'dragon', power: 85, damage_class: 'special' },
          { name: 'Crunch', type: 'dark', power: 80, damage_class: 'physical' }
        ]
      },
      {
        name: 'Aerodactyl',
        hp: 180,
        maxHp: 180,
        types: ['rock', 'flying'],
        stats: { attack: 105, defense: 65, special_attack: 60, special_defense: 75, speed: 130 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/142.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/142.png',
        moves: [
          { name: 'Stone Edge', type: 'rock', power: 100, damage_class: 'physical' },
          { name: 'Wing Attack', type: 'flying', power: 60, damage_class: 'physical' },
          { name: 'Iron Head', type: 'steel', power: 80, damage_class: 'physical' }
        ]
      },
      {
        name: 'Dragonite',
        hp: 210,
        maxHp: 210,
        types: ['dragon', 'flying'],
        stats: { attack: 134, defense: 95, special_attack: 100, special_defense: 100, speed: 80 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
        moves: [
          { name: 'Outrage', type: 'dragon', power: 120, damage_class: 'physical' },
          { name: 'Hurricane', type: 'flying', power: 110, damage_class: 'special' },
          { name: 'Fire Punch', type: 'fire', power: 75, damage_class: 'physical' }
        ]
      }
    ]
  },
  cynthia: {
    id: 'cynthia',
    name: 'Cynthia (แชมเปียนแห่งภูมิภาคชินโอ)',
    badge: 'Sinnoh Crown',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/destiny-knot.png',
    reward: 12500,
    difficulty: 'Master (ระดับมาสเตอร์)',
    region: 'champions',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/cynthia.png',
    hint: 'ทีมสมดุลสูงสุด Spiritomb ไม่มีจุดอ่อนเด่นชัด และ Garchomp รวดเร็วและรุนแรงมาก!',
    pokemon: [
      {
        name: 'Spiritomb',
        hp: 180,
        maxHp: 180,
        types: ['ghost', 'dark'],
        stats: { attack: 92, defense: 108, special_attack: 92, special_defense: 108, speed: 35 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/442.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/442.png',
        moves: [
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Dark Pulse', type: 'dark', power: 80, damage_class: 'special' },
          { name: 'Psychic', type: 'psychic', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Lucario',
        hp: 190,
        maxHp: 190,
        types: ['fighting', 'steel'],
        stats: { attack: 110, defense: 70, special_attack: 115, special_defense: 70, speed: 90 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/448.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png',
        moves: [
          { name: 'Aura Sphere', type: 'fighting', power: 80, damage_class: 'special' },
          { name: 'Flash Cannon', type: 'steel', power: 80, damage_class: 'special' },
          { name: 'Dragon Pulse', type: 'dragon', power: 85, damage_class: 'special' }
        ]
      },
      {
        name: 'Garchomp',
        hp: 220,
        maxHp: 220,
        types: ['dragon', 'ground'],
        stats: { attack: 130, defense: 95, special_attack: 80, special_defense: 85, speed: 102 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/445.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/445.png',
        moves: [
          { name: 'Earthquake', type: 'ground', power: 100, damage_class: 'physical' },
          { name: 'Dragon Claw', type: 'dragon', power: 80, damage_class: 'physical' },
          { name: 'Stone Edge', type: 'rock', power: 100, damage_class: 'physical' }
        ]
      }
    ]
  },
  champion_red: {
    id: 'champion_red',
    name: 'Champion Red (แชมเปียนเรดแห่งเขาชิโรกาเนะ)',
    badge: 'Champion Trophy',
    badgeImage: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/8.png',
    reward: 15000,
    difficulty: 'Legendary (ระดับแชมเปียนสูงสุด)',
    region: 'champions',
    avatar: 'https://play.pokemonshowdown.com/sprites/trainers/red.png',
    hint: 'สุดยอดการประลองระดับสูงสุด ทีมสมดุลรอบด้านและโปเกมอนระดับตำนาน Mewtwo!',
    pokemon: [
      {
        name: 'Pikachu',
        hp: 175,
        maxHp: 175,
        types: ['electric'],
        stats: { attack: 110, defense: 85, special_attack: 110, special_defense: 90, speed: 120 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        moves: [
          { name: 'Volt Tackle', type: 'electric', power: 120, damage_class: 'physical' },
          { name: 'Iron Tail', type: 'steel', power: 100, damage_class: 'physical' },
          { name: 'Thunderbolt', type: 'electric', power: 90, damage_class: 'special' }
        ]
      },
      {
        name: 'Charizard',
        hp: 200,
        maxHp: 200,
        types: ['fire', 'flying'],
        stats: { attack: 105, defense: 85, special_attack: 125, special_defense: 95, speed: 110 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
        moves: [
          { name: 'Blast Burn', type: 'fire', power: 150, damage_class: 'special' },
          { name: 'Air Slash', type: 'flying', power: 75, damage_class: 'special' },
          { name: 'Dragon Pulse', type: 'dragon', power: 85, damage_class: 'special' }
        ]
      },
      {
        name: 'Mewtwo',
        hp: 220,
        maxHp: 220,
        types: ['psychic'],
        stats: { attack: 110, defense: 90, special_attack: 154, special_defense: 90, speed: 130 },
        sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
        moves: [
          { name: 'Psystrike', type: 'psychic', power: 100, damage_class: 'special' },
          { name: 'Shadow Ball', type: 'ghost', power: 80, damage_class: 'special' },
          { name: 'Aura Sphere', type: 'fighting', power: 80, damage_class: 'special' },
          { name: 'Ice Beam', type: 'ice', power: 90, damage_class: 'special' }
        ]
      }
    ]
  }
};

// Official Mega Evolution Profiles (Strict canon only)
const MEGA_PROFILES = {
  charizard: {
    mega_x: {
      name: 'Mega Charizard X',
      types: ['fire', 'dragon'],
      statBoost: { attack: 1.45, defense: 1.3, special_attack: 1.3, special_defense: 1.1, speed: 1.1 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10034.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10034.png'
    },
    mega_y: {
      name: 'Mega Charizard Y',
      types: ['fire', 'flying'],
      statBoost: { attack: 1.2, defense: 1.1, special_attack: 1.6, special_defense: 1.3, speed: 1.15 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10035.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10035.png'
    }
  },
  lucario: {
    mega: {
      name: 'Mega Lucario',
      types: ['fighting', 'steel'],
      statBoost: { attack: 1.5, defense: 1.2, special_attack: 1.4, special_defense: 1.1, speed: 1.25 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10059.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10059.png'
    }
  },
  mewtwo: {
    mega_y: {
      name: 'Mega Mewtwo Y',
      types: ['psychic'],
      statBoost: { attack: 1.3, defense: 1.1, special_attack: 1.65, special_defense: 1.35, speed: 1.2 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10044.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10044.png'
    }
  },
  gengar: {
    mega: {
      name: 'Mega Gengar',
      types: ['ghost', 'poison'],
      statBoost: { attack: 1.1, defense: 1.2, special_attack: 1.55, special_defense: 1.25, speed: 1.3 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10038.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10038.png'
    }
  },
  garchomp: {
    mega: {
      name: 'Mega Garchomp',
      types: ['dragon', 'ground'],
      statBoost: { attack: 1.55, defense: 1.3, special_attack: 1.4, special_defense: 1.2, speed: 1.0 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10062.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10062.png'
    }
  },
  blastoise: {
    mega: {
      name: 'Mega Blastoise',
      types: ['water'],
      statBoost: { attack: 1.25, defense: 1.35, special_attack: 1.55, special_defense: 1.3, speed: 1.0 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10036.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10036.png'
    }
  },
  venusaur: {
    mega: {
      name: 'Mega Venusaur',
      types: ['grass', 'poison'],
      statBoost: { attack: 1.2, defense: 1.45, special_attack: 1.45, special_defense: 1.4, speed: 1.0 },
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10033.png',
      artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10033.png'
    }
  }
};

/**
 * Strict check: Can this Pokémon Mega Evolve?
 * Returns megaProfile if valid, or null if cannot Mega Evolve.
 * Pikachu, Snorlax, and any Pokémon without a designated mega profile CANNOT Mega Evolve under any circumstance.
 */
function getValidMegaProfile(pokemonName, heldItemName) {
  if (!pokemonName || !heldItemName) return null;
  const pName = pokemonName.toLowerCase();
  const iName = heldItemName.toLowerCase();

  if (pName.includes('charizard')) {
    if (iName.includes('charizardite y')) return MEGA_PROFILES.charizard.mega_y;
    if (iName.includes('charizardite x') || iName.includes('charizardite')) return MEGA_PROFILES.charizard.mega_x;
    return null;
  }
  if (pName.includes('lucario') && iName.includes('lucarionite')) {
    return MEGA_PROFILES.lucario.mega;
  }
  if (pName.includes('mewtwo') && (iName.includes('mewtwonite y') || iName.includes('mewtwonite x') || iName.includes('mewtwonite'))) {
    return MEGA_PROFILES.mewtwo.mega_y;
  }
  if (pName.includes('gengar') && iName.includes('gengarite')) {
    return MEGA_PROFILES.gengar.mega;
  }
  if (pName.includes('garchomp') && iName.includes('garchompite')) {
    return MEGA_PROFILES.garchomp.mega;
  }
  if (pName.includes('blastoise') && iName.includes('blastoisinite')) {
    return MEGA_PROFILES.blastoise.mega;
  }
  if (pName.includes('venusaur') && iName.includes('venusaurite')) {
    return MEGA_PROFILES.venusaur.mega;
  }

  // ANY other Pokemon or mismatched Mega Stone is strictly null
  return null;
}

/**
 * Strict check: Can this Pokémon use a Z-Move?
 * Must hold a Z-Crystal AND possess a move matching that element!
 */
function getValidZMove(pokemon, heldItemName) {
  if (!heldItemName || !pokemon) return null;
  const iName = heldItemName.toLowerCase();
  if (!iName.includes(' z') && !iName.includes('ium_z') && !iName.includes('-z')) return null;

  let zType = null;
  if (iName.includes('firium')) zType = 'fire';
  else if (iName.includes('waterium')) zType = 'water';
  else if (iName.includes('electrium')) zType = 'electric';
  else if (iName.includes('grassium')) zType = 'grass';
  else if (iName.includes('dragonium')) zType = 'dragon';
  else if (iName.includes('fightinium')) zType = 'fighting';
  else if (iName.includes('psychium')) zType = 'psychic';

  if (!zType) return null;

  const moves = pokemon.moves || [];
  const hasMatchingMove = moves.some(m => (m.type || '').toLowerCase() === zType);
  if (!hasMatchingMove) return null;

  return Z_MOVES[zType] || Z_MOVES.default;
}

// Z-Moves by Type
const Z_MOVES = {
  fire: { name: 'Inferno Overdrive (มหาวิบัติเพลิงผลาญ)', power: 200, type: 'fire' },
  water: { name: 'Hydro Vortex (มหาพายุหมุนวารี)', power: 200, type: 'water' },
  electric: { name: '10,000,000 Volt Thunderbolt (มหาอสุนีบาต 10 ล้านโวลต์)', power: 220, type: 'electric' },
  grass: { name: 'Bloom Doom (มหาพฤกษาพินาศ)', power: 200, type: 'grass' },
  dragon: { name: 'Devastating Drake (มังกรสะเทือนโลกา)', power: 210, type: 'dragon' },
  fighting: { name: 'All-Out Pummeling (หมัดทะลวงวิญญาณ)', power: 200, type: 'fighting' },
  psychic: { name: 'Shattered Psyche (พลังจิตทำลายมิติ)', power: 200, type: 'psychic' },
  ghost: { name: 'Never-Ending Nightmare (ฝันร้ายไร้ที่สิ้นสุด)', power: 200, type: 'ghost' },
  default: { name: 'Breakneck Blitz (ดาวตกทะลวงมิติ)', power: 200, type: 'normal' }
};

// Max Moves by Type for Dynamax
const MAX_MOVES = {
  fire: { name: 'Max Flare (แม็กซ์เฟลร์)', power: 140, type: 'fire' },
  water: { name: 'Max Geyser (แม็กซ์ไกเซอร์)', power: 140, type: 'water' },
  electric: { name: 'Max Lightning (แม็กซ์ไลท์นิง)', power: 140, type: 'electric' },
  grass: { name: 'Max Overgrowth (แม็กซ์โอเวอร์โกรว์)', power: 140, type: 'grass' },
  dragon: { name: 'Max Wyrmwind (แม็กซ์เวิร์มวินด์)', power: 140, type: 'dragon' },
  fighting: { name: 'Max Knuckle (แม็กซ์นัคเคิล)', power: 140, type: 'fighting' },
  psychic: { name: 'Max Mindstorm (แม็กซ์มายด์สตอร์ม)', power: 140, type: 'psychic' },
  normal: { name: 'Max Strike (แม็กซ์สไตรค์)', power: 140, type: 'normal' },
  default: { name: 'Max Strike (แม็กซ์สไตรค์)', power: 140, type: 'normal' }
};

/**
 * Execute a single attack from attacker against defender with Held Items, Mega, Z-Move & Dynamax support
 */
function calculateAttack(attacker, defender, baseMove, options = {}) {
  const { isZMove = false, isDynamax = false } = options;

  let move = { ...baseMove };

  // 1. If Z-Move is active, transform move
  if (isZMove) {
    const moveType = (move.type || 'normal').toLowerCase();
    const zProfile = Z_MOVES[moveType] || Z_MOVES.default;
    move = {
      name: zProfile.name,
      type: zProfile.type,
      power: zProfile.power,
      damage_class: move.damage_class || 'special',
      isZMove: true
    };
  } else if (isDynamax) {
    // 2. If Dynamax is active, transform to Max Move
    const moveType = (move.type || 'normal').toLowerCase();
    const maxProfile = MAX_MOVES[moveType] || MAX_MOVES.default;
    move = {
      name: maxProfile.name,
      type: maxProfile.type,
      power: maxProfile.power,
      damage_class: move.damage_class || 'physical',
      isDynamax: true
    };
  }

  const isSpecial = move.damage_class === 'special';
  let atk = isSpecial 
    ? (attacker.stats?.special_attack || 80) 
    : (attacker.stats?.attack || 80);
  let def = isSpecial 
    ? (defender.stats?.special_defense || 70) 
    : (defender.stats?.defense || 70);

  // Held item modifier: Choice Band (Physical Atk +50%)
  if (attacker.held_item_name?.toLowerCase().includes('choice band') && !isSpecial) {
    atk = Math.round(atk * 1.5);
  }

  // Held item modifier: Assault Vest (Special Def +40%)
  if (defender.held_item_name?.toLowerCase().includes('assault vest') && isSpecial) {
    def = Math.round(def * 1.4);
  }

  const level = attacker.level || 50;
  const power = move.power || 60;

  // Type effectiveness multiplier
  const { multiplier: typeMult, message: typeMsg } = getTypeEffectiveness(move.type, defender.types);

  // STAB (Same Type Attack Bonus)
  const isStab = (attacker.types || []).includes(move.type?.toLowerCase());
  const stabMult = isStab ? 1.5 : 1.0;

  // Critical hit (Z-Moves guarantee or have high crit)
  const isCrit = isZMove ? (Math.random() < 0.25) : (Math.random() < 0.08);
  const critMult = isCrit ? 1.5 : 1.0;

  // Random factor 0.85 - 1.0
  const randomFactor = 0.85 + Math.random() * 0.15;

  let damage = 0;
  if (typeMult > 0) {
    const baseDamage = (22 * power * (atk / def) / 50 + 2);
    damage = Math.round(baseDamage * stabMult * typeMult * critMult * randomFactor);

    // Life Orb bonus (+30% damage)
    if (attacker.held_item_name?.toLowerCase().includes('life orb')) {
      damage = Math.round(damage * 1.3);
    }

    damage = Math.max(1, damage);
  }

  // Held item check: Focus Sash on defender (if at 100% HP and lethal hit)
  let sashTriggered = false;
  if (
    defender.held_item_name?.toLowerCase().includes('focus sash') &&
    defender.hp === defender.maxHp &&
    damage >= defender.hp
  ) {
    damage = defender.hp - 1;
    sashTriggered = true;
  }

  // Recoil damage check for Life Orb
  let recoilDamage = 0;
  if (attacker.held_item_name?.toLowerCase().includes('life orb') && damage > 0) {
    recoilDamage = Math.max(1, Math.round(attacker.maxHp * 0.1));
  }

  const logs = [];
  if (isZMove) {
    logs.push(`[Z-MOVE] Z-POWER สถิต! ${attacker.nickname || attacker.name} ปลดปล่อย Z-MOVE 【${move.name}】!!`);
  } else if (isDynamax) {
    logs.push(`[DYNAMAX] DYNAMAX POWER! ${attacker.nickname || attacker.name} โจมตีด้วย MAX MOVE 【${move.name}】!!`);
  } else {
    logs.push(`${attacker.nickname || attacker.name} ใช้ท่า 【${move.name}】! (${move.type.toUpperCase()})`);
  }
  
  if (isCrit) logs.push(`[CRITICAL] ติดคริติคอล! (Critical Hit! x1.5)`);
  if (typeMsg) logs.push(`[EFFECT] ${typeMsg}`);
  if (damage > 0) {
    logs.push(`[DAMAGE] ${defender.nickname || defender.name} ได้รับความเสียหาย ${damage} หน่วย!`);
  }
  if (sashTriggered) {
    logs.push(`[Focus Sash] Focus Sash ทำงาน! ${defender.nickname || defender.name} ทนทานการโจมตี รอดชีวิตด้วย 1 HP!`);
  }
  if (recoilDamage > 0) {
    logs.push(`[Life Orb] Life Orb ดึงพลังชีวิต! ${attacker.nickname || attacker.name} เสีย HP ${recoilDamage} หน่วย`);
  }

  return {
    damage,
    isCrit,
    typeMult,
    typeMsg,
    fxType: move.type ? move.type.toLowerCase() : 'normal',
    isZMove,
    isDynamax,
    recoilDamage,
    sashTriggered,
    moveName: move.name,
    logs
  };
}

module.exports = {
  GYM_LEADERS,
  MEGA_PROFILES,
  Z_MOVES,
  MAX_MOVES,
  calculateAttack,
  getValidMegaProfile,
  getValidZMove
};


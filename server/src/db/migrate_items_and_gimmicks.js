const { pool } = require('../config/db');

async function migrate() {
  console.log('📦 Starting Items & Battle Gimmicks Migration...');

  try {
    // 1. Update user_pokemons table for held items and status
    await pool.query(`
      ALTER TABLE user_pokemons 
      ADD COLUMN IF NOT EXISTS held_item_id INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS held_item_name VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS is_mega BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_dynamax BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ user_pokemons table updated with held item & gimmick columns');

    // 2. Create items catalog table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        name_en VARCHAR(100) NOT NULL,
        category VARCHAR(30) NOT NULL, -- 'BATTLE', 'HELD', 'MEGA_STONE', 'Z_CRYSTAL', 'DYNAMAX'
        description TEXT,
        effect_type VARCHAR(50) NOT NULL, -- 'HEAL_HP', 'REVIVE', 'BOOST_ATK', 'BOOST_DEF', 'HELD_LEFTOVERS', 'HELD_FOCUS_SASH', 'HELD_LIFE_ORB', 'HELD_CHOICE_BAND', 'HELD_ASSAULT_VEST', 'MEGA_STONE', 'Z_CRYSTAL', 'DYNAMAX'
        effect_value NUMERIC(10, 2) DEFAULT 0,
        price_fuku NUMERIC(10, 2) NOT NULL,
        rarity VARCHAR(20) DEFAULT 'Common',
        icon_url TEXT NOT NULL,
        target_pokemon VARCHAR(50) DEFAULT NULL,
        is_shop_item BOOLEAN DEFAULT TRUE,
        is_flash_auction BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ items table created');

    // 3. Create user_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_items (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        item_id INT REFERENCES items(id) ON DELETE CASCADE,
        quantity INT DEFAULT 1 CHECK (quantity >= 0),
        acquired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
    `);
    console.log('✅ user_items table created');

    // 4. Update auctions table to support item auctions
    await pool.query(`
      ALTER TABLE auctions 
      ADD COLUMN IF NOT EXISTS item_id INT REFERENCES items(id) ON DELETE CASCADE;
      
      -- Make user_pokemon_id nullable so auctions can sell items directly
      ALTER TABLE auctions ALTER COLUMN user_pokemon_id DROP NOT NULL;
    `);
    console.log('✅ auctions table updated to support rare item auctions');

    // 5. Seed Items Catalog
    const items = [
      // Consumable Battle Items (Shop)
      {
        code: 'potion',
        name: 'Potion (ยารักษาแผล)',
        name_en: 'Potion',
        category: 'BATTLE',
        description: 'ฟื้นฟูพลังชีวิต (HP) 60 หน่วย ให้แก่โปเกมอนในการต่อสู้',
        effect_type: 'HEAL_HP',
        effect_value: 60,
        price_fuku: 200,
        rarity: 'Common',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'super_potion',
        name: 'Super Potion (ยารักษาแผลชั้นดี)',
        name_en: 'Super Potion',
        category: 'BATTLE',
        description: 'ฟื้นฟูพลังชีวิต (HP) 120 หน่วย ให้แก่โปเกมอนในการต่อสู้',
        effect_type: 'HEAL_HP',
        effect_value: 120,
        price_fuku: 500,
        rarity: 'Common',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'hyper_potion',
        name: 'Hyper Potion (ยารักษาแผลขั้นสูง)',
        name_en: 'Hyper Potion',
        category: 'BATTLE',
        description: 'ฟื้นฟูพลังชีวิต (HP) 200 หน่วย ให้แก่โปเกมอนในการต่อสู้',
        effect_type: 'HEAL_HP',
        effect_value: 200,
        price_fuku: 1000,
        rarity: 'Rare',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'max_potion',
        name: 'Max Potion (ยารักษาแผลสูงสุด)',
        name_en: 'Max Potion',
        category: 'BATTLE',
        description: 'ฟื้นฟูพลังชีวิต (HP) เต็ม 100% ให้แก่โปเกมอนทันที',
        effect_type: 'HEAL_HP',
        effect_value: 9999,
        price_fuku: 2500,
        rarity: 'Epic',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'revive',
        name: 'Revive (ชิ้นส่วนชุบชีวิต)',
        name_en: 'Revive',
        category: 'BATTLE',
        description: 'ชุบชีวิตโปเกมอนที่หมดสติขึ้นมาด้วย HP 50%',
        effect_type: 'REVIVE',
        effect_value: 50,
        price_fuku: 1800,
        rarity: 'Rare',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'x_attack',
        name: 'X-Attack (สารกระตุ้นพลังโจมตี)',
        name_en: 'X-Attack',
        category: 'BATTLE',
        description: 'เพิ่มพลังโจมตี (Attack) 50% ให้กับโปเกมอนในสนามจนจบการต่อสู้',
        effect_type: 'BOOST_ATK',
        effect_value: 50,
        price_fuku: 800,
        rarity: 'Common',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-attack.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'x_defense',
        name: 'X-Defense (สารเสริมเกราะป้องกัน)',
        name_en: 'X-Defense',
        category: 'BATTLE',
        description: 'เพิ่มพลังป้องกัน (Defense) 50% ให้กับโปเกมอนในสนามจนจบการต่อสู้',
        effect_type: 'BOOST_DEF',
        effect_value: 50,
        price_fuku: 800,
        rarity: 'Common',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-defense.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },

      // Held Items (Shop)
      {
        code: 'leftovers',
        name: 'Leftovers (เศษแอปเปิ้ลฟื้นฟู)',
        name_en: 'Leftovers',
        category: 'HELD',
        description: 'ฟื้นฟู HP 1/16 ทุกสิ้นเทิร์นโดยอัตโนมัติขณะสวมใส่',
        effect_type: 'HELD_LEFTOVERS',
        effect_value: 6.25,
        price_fuku: 4000,
        rarity: 'Rare',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leftovers.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'focus_sash',
        name: 'Focus Sash (สายรัดตั้งสมาธิ)',
        name_en: 'Focus Sash',
        category: 'HELD',
        description: 'หากถูกโจมตีครั้งเดียวตายเมื่อ HP เต็ม จะรอดชีวิตด้วย 1 HP เสมอ',
        effect_type: 'HELD_FOCUS_SASH',
        effect_value: 1,
        price_fuku: 4500,
        rarity: 'Epic',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/focus-sash.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'life_orb',
        name: 'Life Orb (ลูกแก้วพลังชีวิต)',
        name_en: 'Life Orb',
        category: 'HELD',
        description: 'เพิ่มพลังความเสียหายในการโจมตี 30% แลกกับเสีย HP 10% เมื่อโจมตีสำเร็จ',
        effect_type: 'HELD_LIFE_ORB',
        effect_value: 30,
        price_fuku: 5000,
        rarity: 'Epic',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/life-orb.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'choice_band',
        name: 'Choice Band (แถบผ้าคาดแห่งพลัง)',
        name_en: 'Choice Band',
        category: 'HELD',
        description: 'เพิ่มพลังโจมตีกายภาพ (Physical Attack) 50%',
        effect_type: 'HELD_CHOICE_BAND',
        effect_value: 50,
        price_fuku: 4800,
        rarity: 'Epic',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/choice-band.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },
      {
        code: 'assault_vest',
        name: 'Assault Vest (เสื้อกั๊กจู่โจม)',
        name_en: 'Assault Vest',
        category: 'HELD',
        description: 'เพิ่มพลังป้องกันพิเศษ (Special Defense) 40%',
        effect_type: 'HELD_ASSAULT_VEST',
        effect_value: 40,
        price_fuku: 4200,
        rarity: 'Rare',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/assault-vest.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: false
      },

      // Mega Stones (Flash Auction & Rare Shop)
      {
        code: 'charizardite_x',
        name: 'Charizardite X (หินเมก้าลิซาร์ดอน X)',
        name_en: 'Charizardite X',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Charizard เพื่อปลดล็อคการแปลงร่าง Mega Charizard X (ธาตุ Fire/Dragon) พร้อมพลังโจมตีอันทรงพลัง',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 15000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charizardite-x.png',
        target_pokemon: 'charizard',
        is_shop_item: true,
        is_flash_auction: true
      },
      {
        code: 'charizardite_y',
        name: 'Charizardite Y (หินเมก้าลิซาร์ดอน Y)',
        name_en: 'Charizardite Y',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Charizard เพื่อปลดล็อค Mega Charizard Y (ธาตุ Fire/Flying) พลัง Special Attack สูงลิบลิ่ว',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 15000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/charizardite-y.png',
        target_pokemon: 'charizard',
        is_shop_item: false,
        is_flash_auction: true
      },
      {
        code: 'lucarionite',
        name: 'Lucarionite (หินเมก้าลูคาริโอ)',
        name_en: 'Lucarionite',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Lucario เพื่อปลดล็อค Mega Lucario (Fighting/Steel) อัปเกรดพลังโจมตีและความแม่นยำสูงสุด',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 16000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lucarionite.png',
        target_pokemon: 'lucario',
        is_shop_item: true,
        is_flash_auction: true
      },
      {
        code: 'mewtwonite_y',
        name: 'Mewtwonite Y (หินเมก้ามิวทู Y)',
        name_en: 'Mewtwonite Y',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Mewtwo เพื่อปลดล็อค Mega Mewtwo Y สเตตัส Special Attack สถิติโลก 190 หน่วย!',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 25000,
        rarity: 'Mythical',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mewtwonite-y.png',
        target_pokemon: 'mewtwo',
        is_shop_item: false,
        is_flash_auction: true
      },
      {
        code: 'gengarite',
        name: 'Gengarite (หินเมก้าเก็งกา)',
        name_en: 'Gengarite',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Gengar เพื่อแปลงร่างเป็น Mega Gengar (Ghost/Poison)',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 15000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/gengarite.png',
        target_pokemon: 'gengar',
        is_shop_item: false,
        is_flash_auction: true
      },
      {
        code: 'garchompite',
        name: 'Garchompite (หินเมก้ากาเบรียส)',
        name_en: 'Garchompite',
        category: 'MEGA_STONE',
        description: 'สวมใส่ให้ Garchomp เพื่อแปลงร่างเป็น Mega Garchomp (Dragon/Ground)',
        effect_type: 'MEGA_STONE',
        effect_value: 100,
        price_fuku: 18000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/garchompite.png',
        target_pokemon: 'garchomp',
        is_shop_item: false,
        is_flash_auction: true
      },

      // Z-Crystals (Flash Auction & Shop Specials)
      {
        code: 'firium_z',
        name: 'Firium Z (ผลึก Z ธาตุไฟ)',
        name_en: 'Firium Z',
        category: 'Z_CRYSTAL',
        description: 'สวมใส่เพื่อปลดล็อค Z-Move ธาตุไฟ "Inferno Overdrive" (Power 200) คัตซีนระเบิดเพลิงผลาญ!',
        effect_type: 'Z_CRYSTAL',
        effect_value: 200,
        price_fuku: 12000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/firium-z--held.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: true
      },
      {
        code: 'waterium_z',
        name: 'Waterium Z (ผลึก Z ธาตุน้ำ)',
        name_en: 'Waterium Z',
        category: 'Z_CRYSTAL',
        description: 'สวมใส่เพื่อปลดล็อค Z-Move ธาตุน้ำ "Hydro Vortex" (Power 200) คลื่นน้ำวนกลืนกิน!',
        effect_type: 'Z_CRYSTAL',
        effect_value: 200,
        price_fuku: 12000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/waterium-z--held.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: true
      },
      {
        code: 'electrium_z',
        name: 'Electrium Z (ผลึก Z ธาตุไฟฟ้า)',
        name_en: 'Electrium Z',
        category: 'Z_CRYSTAL',
        description: 'สวมใส่เพื่อปลดล็อค Z-Move ธาตุไฟฟ้า "10,000,000 Volt Thunderbolt" (Power 220)!',
        effect_type: 'Z_CRYSTAL',
        effect_value: 220,
        price_fuku: 15000,
        rarity: 'Mythical',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/electrium-z--held.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: true
      },
      {
        code: 'dragonium_z',
        name: 'Dragonium Z (ผลึก Z ธาตุมังกร)',
        name_en: 'Dragonium Z',
        category: 'Z_CRYSTAL',
        description: 'สวมใส่เพื่อปลดล็อค Z-Move ธาตุมังกร "Devastating Drake" (Power 210)!',
        effect_type: 'Z_CRYSTAL',
        effect_value: 210,
        price_fuku: 14000,
        rarity: 'Legendary',
        icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dragonium-z--held.png',
        target_pokemon: null,
        is_shop_item: false,
        is_flash_auction: true
      },

      // Dynamax & Special
      {
        code: 'dynamax_band',
        name: 'Dynamax Band (สายรัดไดนาแมกซ์)',
        name_en: 'Dynamax Band',
        category: 'DYNAMAX',
        description: 'ขยายร่างยักษ์ Dynamax 3 เทิร์น เพิ่ม HP x 2 พร้อมเปลี่ยนทุกสกิลเป็น Max Moves สุดทรงพลัง!',
        effect_type: 'DYNAMAX',
        effect_value: 2,
        price_fuku: 20000,
        rarity: 'Mythical',
        icon_url: '/items/dynamax-band.png',
        target_pokemon: null,
        is_shop_item: true,
        is_flash_auction: true
      }
    ];

    for (const item of items) {
      await pool.query(`
        INSERT INTO items (code, name, name_en, category, description, effect_type, effect_value, price_fuku, rarity, icon_url, target_pokemon, is_shop_item, is_flash_auction)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          name_en = EXCLUDED.name_en,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          effect_type = EXCLUDED.effect_type,
          effect_value = EXCLUDED.effect_value,
          price_fuku = EXCLUDED.price_fuku,
          rarity = EXCLUDED.rarity,
          icon_url = EXCLUDED.icon_url,
          target_pokemon = EXCLUDED.target_pokemon,
          is_shop_item = EXCLUDED.is_shop_item,
          is_flash_auction = EXCLUDED.is_flash_auction;
      `, [
        item.code, item.name, item.name_en, item.category, item.description,
        item.effect_type, item.effect_value, item.price_fuku, item.rarity,
        item.icon_url, item.target_pokemon, item.is_shop_item, item.is_flash_auction
      ]);
    }

    console.log(`✅ Seeded ${items.length} items successfully into items table!`);

    // Give ash_ketchum some starter battle items and a Mega Stone & Z-Crystal for testing
    const ashRes = await pool.query(`SELECT id FROM users WHERE username = 'ash_ketchum'`);
    if (ashRes.rows.length > 0) {
      const ashId = ashRes.rows[0].id;
      const starterItems = [
        { code: 'hyper_potion', qty: 5 },
        { code: 'max_potion', qty: 3 },
        { code: 'revive', qty: 3 },
        { code: 'charizardite_x', qty: 1 },
        { code: 'electrium_z', qty: 1 },
        { code: 'dynamax_band', qty: 1 },
        { code: 'focus_sash', qty: 1 },
        { code: 'leftovers', qty: 1 }
      ];

      for (const s of starterItems) {
        const itemRow = await pool.query(`SELECT id FROM items WHERE code = $1`, [s.code]);
        if (itemRow.rows.length > 0) {
          await pool.query(`
            INSERT INTO user_items (user_id, item_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_items.quantity + EXCLUDED.quantity;
          `, [ashId, itemRow.rows[0].id, s.qty]);
        }
      }
      console.log('✅ Granted Ash Ketchum starter battle items, Charizardite X, Electrium Z, and Dynamax Band');
    }

    console.log('🎉 Items & Gimmicks Migration Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();

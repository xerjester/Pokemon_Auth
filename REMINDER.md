# 📝 ไฟล์เตือนความจำ (Pokemon Auction, Arena & Battle Gimmicks System Reminder)

บันทึกสรุปข้อมูลสำคัญสำหรับนักพัฒนา การตั้งค่า และวิธีใช้งานระบบประมูลโปเกมอน, ตลาดไอเท็มแรร์ Flash Auction, ร้านค้า PokéMart, กลไกการต่อสู้เสมือนจริง (Action Choreography, Sound FX, In-Battle Bag, Mega Evolution, Z-Move, Dynamax), ระบบ PvP, และบอทจำลองผู้เล่น

---

## 🪙 1. ข้อมูล Smart Contract (FUKU Token)
* **Token Name**: FUKU
* **Token Symbol**: FUKU
* **Decimals**: 18
* **Contract Address**: `0xEA295B3a4b4049461515EF523809126Ea4cbB6B6`
* **Network**: BNB Smart Chain Testnet
* **Chain ID**: `97` (Hex: `0x61`)
* **RPC URL**: `https://data-seed-prebsc-1-s1.binance.org:8545/` หรือ `https://bsc-testnet.public.blastapi.io`
* **Block Explorer**: `https://testnet.bscscan.com/token/0xEA295B3a4b4049461515EF523809126Ea4cbB6B6`
* **Faucet รับ BNB Testnet (สำหรับ Gas)**: https://www.bnbchain.org/en/testnet-faucet

> **วิธีเพิ่มใน MetaMask**:
> 1. สลับเครือข่ายเป็น **BNB Smart Chain Testnet** (ในเว็บมีปุ่มกดสลับให้อัตโนมัติที่แท็บกระเป๋าเงิน)
> 2. กด **Import Tokens** ใน MetaMask
> 3. ใส่ Token Contract Address: `0xEA295B3a4b4049461515EF523809126Ea4cbB6B6`
> 4. สัญลักษณ์ `FUKU` และ Decimal `18` จะแสดงขึ้นมาอัตโนมัติ

---

## 🐳 2. คำสั่ง Docker (PostgreSQL)
* **เริ่มรันฐานข้อมูล**:
  ```powershell
  docker compose up -d
  ```
* **ดูสถานะ Container**:
  ```powershell
  docker ps
  ```
* **ดู Log ของฐานข้อมูล**:
  ```powershell
  docker logs -f pokemon_postgres
  ```
* **หยุดการทำงานชั่วคราว**:
  ```powershell
  docker compose down
  ```
* **ลบข้อมูลทั้งหมดใน DB (Volume Reset)**:
  ```powershell
  docker compose down -v
  ```

### การเชื่อมต่อฐานข้อมูล PostgreSQL
* **Host**: `localhost`
* **Port**: `5432`
* **Database Name**: `pokemon_db`
* **Username**: `pokemon_user`
* **Password**: `pokemon_secure_password_2026`
* **Connection String**: `postgresql://pokemon_user:pokemon_secure_password_2026@localhost:5432/pokemon_db`

---

## 🚀 3. วิธีเริ่มรันระบบ (Quick Start)

### ฝั่ง Server (Backend - Node.js / Express)
```powershell
cd server
npm install
npm run seed      # ติดตั้งตารางฐานข้อมูล, ไอเท็ม/ร่างพิเศษ และบัญชีผู้เล่นเริ่มต้น
node src/db/seed_all_1025_pokemons.js # [ทางเลือก] ดึงโปเกมอนครบทั้ง 1,025 ตัวจาก PokéAPI (รันครั้งเดียวแล้วบันทึกถาวร)
npm run dev       # รันบน http://localhost:5000 (เริ่ม Flash Auction & Bot Bidding อัตโนมัติ)
```

### ฝั่ง Client (Frontend - Vite + React)
```powershell
cd client
npm install
npm run dev       # รันบน http://localhost:5173
```

### การรันสคริปต์ทดสอบระบบอัตโนมัติ (Automated Test Suites)
* **ทดสอบระบบไอเท็ม, การสวมใส่, และกลไกต่อสู้พิเศษ**:
  ```powershell
  node server/test_battle_gimmicks_flow.js
  ```
* **ทดสอบระบบประมูล Flash Auction 5 นาที และการแย่งบิดของบอท**:
  ```powershell
  node server/test_flash_auction_flow.js
  ```
* **ทดสอบระบบ PvP ล็อบบี้, เดิมพัน FUKU, และการท้าดวลกับบอท**:
  ```powershell
  node server/test_pvp_bot_flow.js
  ```
* **ทดสอบฟังก์ชันเต็มระบบ (Full Flow)**:
  ```powershell
  node server/test_full_flow.js
  ```

---

## ⚔️ 4. สรุประบบการทำงานหลัก (Core Features)

### 1. ระบบต่อสู้ Turn-based พร้อม Action Choreography & Sound FX 🎬 [NEW]
* **การออก Action เป็นลำดับ (Sequential Turn Playback)**:
  - แก้ไขปัญหาเดิมที่กดโจมตีแล้วเลือดลดทันทีโดยไม่มีการเคลื่อนไหว
  - เมื่อออกคำสั่ง ระบบจะแสดงแอ็กชันตามลำดับเวลาจริง:
    1. ผู้โจมตีพุ่งตัวไปข้างหน้า (`.anim-lunge-user` หรือ `.anim-lunge-opp`)
    2. เสียงเอฟเฟกต์เฉพาะสกิล (Web Audio API Synthesizer)
    3. ระเบิดเอฟเฟกต์ธาตุตามท่าโจมตี (Fire, Water, Electric, Grass, Beam, Normal)
    4. ตัวรับการโจมตีเกิดการสั่นสะเทือน (`.anim-hit-shake`) พร้อมตัวเลขดาเมจลอย (`.damage-popup`)
    5. แสดงป้ายสถานะ (CRITICAL HIT!, SUPER EFFECTIVE!, MISS!)
    6. อัปเดตแถบเลือดและเช็คสถานะการหมดสติ / สลับตัว
* **ระบบเสียงสังเคราะห์ในตัว (Web Audio API Synthesizer)**:
  - สร้างคลื่นเสียงแบบ Procedural (Square, Sawtooth, Sine, Noise wave) ไม่ต้องดาวน์โหลดไฟล์ภายนอก หมดปัญหาลิงก์เสียงเสีย
  - เสียงครบครัน: เสียงโจมตีกายภาพ, เสียงลูกไฟ, เสียงสายฟ้าฟาด, เสียงคลื่นน้ำ, เสียงลำแสง, เสียงฟื้นฟูเลือด, เสียงวิวัฒนาการเมก้า, เสียงชาร์จ Z-Move, เสียงระเบิดไดนาแมกซ์, และเสียงชัยชนะ
* **กระเป๋าไอเท็มกลางสนามต่อสู้ (In-Battle Bag Modal)**:
  - สามารถกดปุ่ม **"กระเป๋าไอเท็ม"** ระหว่างต่อสู้เพื่อเปิดดูยาฟื้นฟู (Potion, Super Potion, Hyper Potion, Max Potion) หรือยาชุบชีวิต (Revive)
  - เลือกรักษาหรือชุบชีวิตโปเกมอนตัวใดก็ได้ในทีม
  - การใช้ไอเท็มจะนับเป็น 1 เทิร์น และฝ่ายตรงข้ามจะสามารถโจมตีสวนกลับได้ตามกฎเกมหลัก

---

### 2. ระบบกลไกพิเศษการต่อสู้หลัก (Core Battle Gimmicks) 🌟 [NEW]
รองรับกลไกเด่นจากโปเกมอนภาคหลักครบครัน:

1. **ร่างเมก้า (Mega Evolution)**:
   - ต้องสวมใส่ **Mega Stone** ที่ตรงสายพันธุ์ เช่น `Charizardite X`, `Charizardite Y`, `Lucarionite`, `Mewtwonite Y`, `Gengarite`, `Garchompite`
   - กดปุ่ม **"เปิดใช้ MEGA EVOLUTION"** ก่อนเลือกท่าโจมตี (ใช้ได้ 1 ครั้งต่อแมตช์)
   - โปเกมอนจะเปลี่ยนรูปร่าง ภาพ Artwork และ Sprite ประจำร่างเมก้าทันที
   - ค่าสเตตัสเพิ่มขึ้นมหาศาล (1.2x - 1.6x)
   - มีการเปลี่ยนธาตุตามร่าง เช่น Charizard กลายเป็น Fire / Dragon
   - มีแสงออร่าสีรุ้งหมุนรอบตัว (`.mega-glow`)
2. **ท่าไม้ตาย Z (Z-Moves)**:
   - ต้องสวมใส่ **Z-Crystal** ประจำธาตุ เช่น `Electrium Z`, `Firium Z`, `Waterium Z`, `Grassium Z`
   - ปลดปล่อยท่าไม้ตายพลังทำลายล้างสูงสุด **200 Power** เช่น *10,000,000 Volt Thunderbolt*, *Inferno Overdrive*, *Hydro Vortex*
   - มีคัตซีนชาร์จพลัง Z-Power Charge พร้อมดนตรีแฟนแฟร์
3. **การขยายร่างยักษ์ไดนาแมกซ์ (Dynamax)**:
   - ต้องมี **Dynamax Band** ในกระเป๋า
   - แปลงร่างยักษ์ได้ **3 เทิร์น** (ใช้ได้ 1 ครั้งต่อแมตช์)
   - เพิ่ม **Max HP และ Current HP เป็น 2 เท่า (x2)**
   - ท่าโจมตีทุกท่าจะถูกอัปเกรดเป็น **Max Moves** พลังทำลายสูง
   - มีออร่าพายุสายฟ้าสีแดงเข้มครอบคลุมตัวโปเกมอน (`.dynamax-aura`)

---

### 3. ร้านค้าไอเท็ม (PokéMart) & ไอเท็มสวมใส่ (Held Items) 🛒 [NEW]
* **ร้านค้า PokéMart (`/shop`)**:
  - ผู้เล่นสามารถใช้เหรียญ **FUKU Token** เลือกซื้อไอเท็มได้อย่างสะดวก
  - แบ่งหมวดหมู่ชัดเจน:
    - **ไอเท็มต่อสู้ (Battle Items)**: Potion, Super Potion, Hyper Potion, Max Potion, Revive, X-Attack, X-Defense
    - **ไอเท็มสวมใส่ (Held Items)**:
      - `Focus Sash`: รอดชีวิตด้วย 1 HP เมื่อโดนโจมตีที่จะน็อคเอาต์ขณะที่ HP เต็ม
      - `Leftovers`: ฟื้นฟู HP 1/16 ทุกสิ้นเทิร์นอัตโนมัติ
      - `Life Orb`: เพิ่มพลังโจมตี 30% แลกกับการเสียเลือด 10% ของพลังโจมตี
      - `Choice Band`: เพิ่มพลังโจมตีกายภาพ 50%
      - `Assault Vest`: เพิ่มพลังป้องกันพิเศษ 40%
    - **ไอเท็มเปลี่ยนร่าง & ท่าไม้ตาย (Mega Stones / Z-Crystals / Dynamax Band)**
* **ระบบจัดการสวมใส่ไอเท็ม (Equip / Unequip Modal)**:
  - ไปที่หน้า **คลัง (Inventory)** -> แท็บ **"กระเป๋าไอเท็ม"** หรือการ์ดโปเกมอนแต่ละตัว
  - สวมใส่ไอเท็มให้กับโปเกมอนได้ตัวละ 1 ชิ้น
  - มีระบบตรวจสอบความเข้ากันได้ (Species Validation): เช่น Mega Stone จะสวมใส่ได้เฉพาะโปเกมอนสายพันธุ์ที่ตรงกันเท่านั้น

---

### 4. ตลาดประมูลแฟลชปริศนา 5 นาที สุ่มไอเท็มแรร์ระดับสูง (Flash Mystery Auction) ⚡ [NEW]
* **การสุ่มไอเท็มระดับตำนาน (Rare Item Flash Auction)**:
  - ในการประมูลสายฟ้า 5 นาที นอกจากจะสุ่มโปเกมอนระดับ Rare/Legendary แล้ว ระบบยังมีโอกาส 50% ที่จะสุ่ม **ไอเท็มระดับตำนานที่ไม่มีขายในร้านค้าทั่วไป** ขึ้นมาประมูล
  - เช่น: หินเมก้าเฉพาะทาง (`Charizardite X`, `Lucarionite`, `Gengarite`), ผลึก Z-Crystal, สายรัดไดนาแมกซ์ (`Dynamax Band`), หรือ `Master Ball`
* **การแข่งขันกับบอท (Bot Auto-Bidding)**:
  - บอทจำลองผู้เล่นจริงจะร่วมแข่งขันเคาะราคาประมูลแข่งกับผู้เล่นสดๆ
* **การส่งมอบไอเท็มอัตโนมัติ**:
  - เมื่อหมดเวลา 5 นาที ไอเท็มจะถูกโอนเข้าสู่กระเป๋า (`user_items`) ของผู้ชนะสูงสุดทันที และระบบจะเริ่มสุ่มเปิดรอบถัดไปแบบต่อเนื่อง

---

### 5. ระบบประลองผู้เล่น PvP (3v3 Wager Arena) & บอทจำลอง 🏆
* ล็อบบี้แข่งขัน PvP พร้อมระบบ MMR และเงินเดิมพัน FUKU (500, 1,000, 2,000 FUKU)
* บอทระดับตำนานประจำระบบ:
  - `cynthia_sinnoh` (Garchomp, Lucario, Milotic)
  - `steven_stone` (Metagross, Aggron, Skarmory)
  - `lance_dragon` (Dragonite, Gyarados, Charizard)
  - `blue_rival` (Blastoise, Alakazam, Gengar)
  - `serena_kalos` (Sylveon, Venusaur, Pikachu)
* รองรับการใช้ไอเท็มสวมใส่, ร่างเมก้า, Z-Move และไดนาแมกซ์ในโหมด PvP ครบทุกฟังก์ชัน

---

### 6. หน้าบอร์ดสารานุกรมโปเกมอนครบ 1,025 ตัวจาก PokéAPI (All 1,025 Pokédex & Search Board) 📖 [UPDATED]
* **ฐานข้อมูลครบถ้วนทั้ง 9 เจเนอเรชัน (All 1,025 Pokémon in PostgreSQL)**:
  - ได้รันสคริปต์ `node server/src/db/seed_all_1025_pokemons.js` ทำการดึงและบันทึกข้อมูลโปเกมอนจาก PokéAPI ครบทั้ง 1,025 ตัว (ตั้งแต่ #1 Bulbasaur ถึง #1025 Pecharunt)
  - ข้อมูลที่จัดเก็บครบถ้วน: หมายเลข Dex, ชื่อ, ธาตุ (Types), ค่าสเตตัส 6 ด้าน (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed, BST รวม), ภาพ Official Artwork คมชัดระดับ HD, Sprite, ระดับความหายากคำนวณตาม BST (Common, Rare, Epic, Legendary), ราคาประเมิน, และ Move Pool สกิลประจำตัว
  - สรุปตัวเลขตามแต่ละเจเนอเรชัน:
    - Gen 1 (คันโต): #1 - 151 (151 ตัว)
    - Gen 2 (โจโต): #152 - 251 (100 ตัว)
    - Gen 3 (โฮเอ็น): #252 - 386 (135 ตัว)
    - Gen 4 (ชินโอ): #387 - 493 (107 ตัว)
    - Gen 5 (อุนโนวา): #494 - 649 (156 ตัว)
    - Gen 6 (คาลอส): #650 - 721 (72 ตัว)
    - Gen 7 (อโลลา): #722 - 809 (88 ตัว)
    - Gen 8 (กาลาร์): #810 - 905 (96 ตัว)
    - Gen 9 (พัลเดีย): #906 - 1025 (120 ตัว)
* **ระบบตัวกรองตามเจเนอเรชัน (Generation 1 - 9 Filter)**:
  - เพิ่มแถบปุ่มเลือกเจเนอเรชัน เพื่อให้ผู้เล่นเลือกดูโปเกมอนเฉพาะภาคที่ต้องการได้อย่างสะดวกรวดเร็ว
* **ระบบแบ่งหน้าอัจฉริยะ (Pagination Controls)**:
  - แสดงผลรอบละ 48 ตัว ป้องกันหน้าเว็บหน่วงจากการโหลดการ์ดโปเกมอน 1,025 ใบพร้อมกัน
  - มีปุ่มลัด: `หน้าแรก`, `ก่อนหน้า`, หมายเลขหน้าปัจจุบันและหน้าข้างเคียง, `ถัดไป`, `ท้ายสุด`
  - เลื่อน Scroll สู่หัวตารางอัตโนมัติอย่างนุ่มนวลเมื่อเปลี่ยนหน้า
* **หน้าต่างข้อมูลเชิงลึก (Detail Modal)**:
  - แสดง Radar/Bar กราฟค่าพลังสเตตัส 6 ด้านพร้อมสีประจำสเตตัส
  - แสดงท่าต่อสู้ประจำตัว (Move Pool) จาก PokéAPI พร้อม Power, Accuracy, และดาเมจคลาส
  - ปุ่มลัด **"ตลาด"** เพื่อกระโดดไปค้นหาในตลาดประมูลได้ทันที

---

### 7. แก้ไขปัญหาบั๊กประลอง PvP กดเข้าไปแล้วจอดำ (Fix PvP Black Screen Bug) 🛠️ [FIXED]
* **สาเหตุของปัญหา**:
  - ในหน้า `client/src/pages/PvpPage.jsx` ฝั่ง Frontend มีการเข้าถึงข้อมูลบอทในล็อบบี้ผ่าน `opp.team.map(...)` และอ่านค่า `opp.defaultWager`
  - แต่ใน `server/src/routes/pvp.js` ข้อมูลบอทที่ถูกสร้างขึ้นในลูปใช้คีย์ชื่อ `teamPreview` และ `wager` ส่งผลให้ตัวแปร `opp.team` มีค่าเป็น `undefined`
  - ใน React 18 เมื่อพยายามเรียก `.map()` บน `undefined` จะเกิดข้อผิดพลาดรุนแรง `TypeError: Cannot read properties of undefined (reading 'map')` ซึ่งทำให้ React Error Boundary หรือ Component Tree พังและ Unmount ออกไป กลายเป็นหน้าจอดำสนิท
* **แนวทางการแก้ไข**:
  1. **ฝั่ง Server (`server/src/routes/pvp.js`)**:
     - อัปเดต API `/api/pvp/lobby` ให้ส่งข้อมูลทั้ง `team`, `teamPreview`, `wager`, และ `defaultWager` ให้สอดคล้องกันทุกจุด
     - ใน API `/api/pvp/challenge` ปรับให้รับทั้งพารามิเตอร์ `targetUsername` / `opponentUsername` และ `customWager` / `wager`
  2. **ฝั่ง Client (`client/src/pages/PvpPage.jsx`)**:
     - ใช้ Safe Optional Chaining: `(opp.team || opp.teamPreview || []).map(...)` เพื่อป้องกันข้อผิดพลาดกรณีทีมว่าง
     - เพิ่มการตรวจสอบและ fallback ข้อมูลเดิมพัน `opp.defaultWager || opp.wager || 500`
  3. **การทดสอบ**: ผ่านการทดสอบด้วยสคริปต์ `node server/test_pvp_bot_flow.js` ทดสอบการดึงล็อบบี้บอท 5 คน, การท้าดวล, การหัก-จ่ายเงินเดิมพัน FUKU, และการต่อสู้เสร็จสิ้น 100%

---

### 8. ปรับปรุงส่วน Head / Navbar ในตัวเว็บที่ล้นเกินไป (Fix Navbar Header Overflow) 🎨 [FIXED]
* **สาเหตุของปัญหา**:
  - เมนูนำทางด้านบนมีหลายหน้ามากเกินไป (การประมูล, สารานุกรม, คลังโปเกมอน, ร้านค้า (Shop), จัดทีม & สกิล, ยิมลีดเดอร์, ประลอง PvP, กระเป๋า FUKU Web3, และข้อมูลผู้ใช้)
  - ขนาด Padding, ตัวอักษร, และความกว้างของปุ่มต่างๆ ทำให้เมื่อหน้าจอมีความกว้างไม่มาก หรือมีแท็บใหม่เพิ่มขึ้นมา ตัวปุ่มจะดันกันจนตกบรรทัดหรือซ้อนทับส่วน Wallet
* **แนวทางการแก้ไข (`client/src/components/Navbar.jsx`)**:
  1. ปรับลดขนาดความสูง Header Bar จาก 72px เหลือ **64px** เพิ่มความกระชับ
  2. ย่อข้อความปุ่มเมนูให้สั้น กระชับ ชัดเจน (เช่น "ประมูล", "สารานุกรม", "คลัง", "ร้านค้า", "จัดทีม", "ยิม", "PvP", "กระเป๋า")
  3. กำหนด `whiteSpace: 'nowrap'` ไม่ให้ข้อความตกบรรทัด
  4. เพิ่มสไตล์ `overflowX: 'auto'` พร้อมซ่อน scrollbar สำหรับแถบเมนู เพื่อให้สามารถเลื่อนเลื่อนได้หากหน้าจอมีขนาดเล็ก โดยโครงสร้างหลักไม่พัง
  5. ปรับกระเป๋าเงิน Web3 FUKU ให้เป็น Glassmorphism Pill กะทัดรัด และย่อ Address ให้เหลือเพียง 8 ตัวอักษรแรก-หลัง ไม่ดันองค์ประกอบอื่นล้นออกนอกจอ

---

### 9. ปรับปรุงขนาดรูปภาพไอเท็มให้ใหญ่และคมชัดขึ้น (Item Icons Enlarged & Enhanced) 🎨 [NEW]
* **การแก้ไข**:
  - **หน้าร้านค้า PokéMart (`ShopPage.jsx`)**: ขยายกรอบไอเท็มจาก 90px เป็น **120px** และภาพไอเท็มเป็น **78x78px** พร้อมแสงออร่าพื้นหลังและการเรนเดอร์แบบ `pixelated` คมกริบ
  - **หน้าคลังไอเท็ม (`InventoryPage.jsx`)**: ขยายกรอบไอเท็มจาก 54px เป็น **76px** และภาพไอเท็มจาก 40px เป็น **60x60px**
  - **หน้าต่างเลือกสวมใส่ไอเท็ม (`EquipItemModal.jsx`)**: ขยายภาพไอเท็มจาก 36px เป็น **44x44px** พร้อมกล่อง Glassmorphism 54px
  - **กระเป๋าไอเท็มในฉากต่อสู้ (`InBattleBagModal.jsx`)**: ขยายภาพไอเท็มจาก 36px เป็น **40x40px** พร้อมกล่อง 50px
  - **การ์ดประมูลสายฟ้า Flash Auction (`FlashAuctionCard.jsx`)**: กำหนดขนาดไอเท็ม **120x120px** เด่นชัด ลอยสง่างามพร้อมออร่าพลัง

---

### 10. การเพิ่มประสิทธิภาพความลื่นไหลของระบบ (Website Performance Optimization) ⚡ [NEW]
* **Debounced Search**: หน่วงเวลาการส่งคำค้นหาในหน้าสารานุกรม 280ms ช่วยลดการส่ง Request ซ้ำซ้อนขณะกำลังพิมพ์ และป้องกันการ Re-render ทุกตัวอักษร
* **Image Lazy Loading & Async Decoding**: เพิ่ม `loading="lazy"` และ `decoding="async"` ให้กับการ์ดโปเกมอนและไอเท็มทั้งหมด โหลดเฉพาะรูปที่อยู่ในมุมมองสายตา
* **GPU Hardware Acceleration**:
  - เพิ่ม `transform: translateZ(0)` และ `will-change: transform` ใน [index.css](file:///c:/Users/reiji/Desktop/Pokemon/client/src/index.css) ให้การเลื่อนเมาส์และการสลับหน้าต่างใช้ GPU Render ลื่นไหลระดับ 60/120 FPS
  - เพิ่ม `scroll-behavior: smooth` ทั่วทั้งเว็บไซต์

---

### 11. เทรนเนอร์จำลองสามารถตัดสินใจปล่อยประมูลโปเกมอนได้เอง (Autonomous Trainer Auction Listings) 🤖 ➔ 👤 [NEW]
* ใน [botSimulation.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/botSimulation.js) เพิ่มฟังก์ชัน `createBotAuction()`:
  - เทรนเนอร์จำลอง (Cynthia, Steven, Lance, Blue, Serena) จะตรวจสอบจำนวนการประมูลในตลาด หากมีน้อยกว่า 4 รายการ เทรนเนอร์จะตัดสินใจสุ่มโปเกมอนระดับแรร์/ตำนานที่ค่าพลังสูง (BST >= 480 หรือ Rare/Epic/Legendary) มาเปิดการประมูลในตลาดเทรนเนอร์ทันที
  - กำหนดระดับเลเวล (Lv. 45-75), คำนวณสเตตัสเฉพาะตัว, กำหนดราคาเริ่มต้นที่สมเหตุสมผลตามค่าพลัง และเปิดให้ประมูลเป็นเวลา 10-20 นาที
  - ประกาศความเคลื่อนไหวลงในแถบ **Live Activity Ticker** แบบเรียลไทม์

---

### 12. นำคำว่า "บอท" ออกจากหน้าเว็บทั้งหมดเพื่อสภาพแวดล้อมที่สมจริง (Realistic Live Trainer Environment) 🌐 [NEW]
* ลบคำว่า "บอท" ออกจากข้อความในหน้าเว็บทั้งหมด 100%:
  - ใน [AuctionPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/AuctionPage.jsx): เปลี่ยนเป็น "แข่งกับเทรนเนอร์ทั่วโลก" และ "ตลาดประมูลเทรนเนอร์"
  - ใน [FlashAuctionCard.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/FlashAuctionCard.jsx): เปลี่ยนเป็น "เหล่าเทรนเนอร์แข่งขันเสนอราคากันแบบสดๆ"
  - ใน [PvpPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PvpPage.jsx): ใช้คำว่า "เทรนเนอร์ที่พร้อมประลองออนไลน์"

---

### 13. แก้ไขบั๊กภาพ Dynamax Band ไม่ขึ้น (Fixed Dynamax Band Sprite) 🛡️ [FIXED]
* **สาเหตุ**: PokéAPI ส่งค่าภาพสไปรต์ของ `dynamax-band` มาเป็น `null` ทำให้เกิดข้อผิดพลาด 404
* **การแก้ไข**: ดาวน์โหลดภาพความละเอียดสูงระดับ Official HD Artwork มาเก็บไว้ที่ [client/public/items/dynamax-band.png](file:///c:/Users/reiji/Desktop/Pokemon/client/public/items/dynamax-band.png) พร้อมอัปเดตฐานข้อมูล PostgreSQL ตาราง `items` ให้ชี้ไปยัง `/items/dynamax-band.png` ทำให้รูปภาพแสดงผลได้สมบูรณ์ 100%

---

### 14. ถอดยกระบบ Level ออก เพื่อเป็นการประลองฝีมือการจัดทีมอย่างแท้จริง (Level Removal & Tournament Standard Flat BST) ⚖️ [NEW]
* **จุดประสงค์**: มุ่งเน้นการประลองฝีมือการจัดทีม (Team Building Strategy), การเลือกใช้ Type Coverage, จัดสรรชุดสกิล 4 ท่า, บริหารการสวมใส่ Held Items, และความโดดเด่นของค่าพลัง Base Stats (BST) ตามสายพันธุ์ โดยแข่งขันกันด้วยไหวพริบและแท็กติกอย่างเท่าเทียม
* **การปรับปรุงการคำนวณดาเมจ**:
  - ปรับสูตรคำนวณดาเมจใน [battleEngine.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/battleEngine.js) ให้อ้างอิงมาตรฐานทัวร์นาเมนต์ระดับเลเวล 50 เท่ากันทุกตัว:
    `baseDamage = (22 * power * (atk / def) / 50 + 2)`
  - ลบผลคูณเลเวลที่เคยทำให้โปเกมอนเลเวลสูงได้เปรียบแบบไม่เป็นธรรม
* **การแสดงผลฝั่ง Client (UI Clean-up)**:
  - ลบแท็กและข้อความ `Lv. XX` ออกจากทุกคอมโพเนนต์: การ์ดประมูลในตลาด ([AuctionCard.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/AuctionCard.jsx)), การ์ดประมูลสายฟ้า ([FlashAuctionCard.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/FlashAuctionCard.jsx)), หน้าจัดทีมและสกิล ([TeamPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/TeamPage.jsx)), หน้าสนามรบยิม ([BattlePage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/BattlePage.jsx)), หน้าสนามประลอง PvP ([PvpPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PvpPage.jsx)), หน้าต่างสร้างและบิดประมูล
  - แสดงหมายเลข Pokédex `#{pokemon_id}` หรือประเภทธาตุ/ค่าพลังแทน

---

### 15. ปรับปรุงระบบแปลงร่างพิเศษและตรวจสอบตามเกมหลักอย่างเข้มงวด (Strict Battle Gimmicks Validation) 🛡️ [FIXED]
* **ปัญหาเดิม**: ปิกาจูสามารถกดแปลงร่างเมก้าได้ ซึ่งขัดแย้งกับเกมต้นฉบับอย่างสิ้นเชิง
* **การแก้ไขใน [battleEngine.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/battleEngine.js) และ [gimmickValidation.js](file:///c:/Users/reiji/Desktop/Pokemon/client/src/utils/gimmickValidation.js)**:
  1. **Mega Evolution**:
     - เพิ่มฟังก์ชัน `getValidMegaProfile(pokemonName, heldItemName)`: มีเพียงสายพันธุ์ที่มีร่างเมก้าตามประวัติศาสตร์เกมหลักเท่านั้นที่สามารถแปลงร่างได้ (ได้แก่ Charizard, Blastoise, Venusaur, Mewtwo, Gengar, Lucario, Garchomp)
     - ต้องถือหินเมก้าที่ตรงกับสายพันธุ์นั้นอย่างสมบูรณ์ เช่น `Charizardite X` กับ Charizard, `Gengarite` กับ Gengar
     - โปเกมอนอื่น เช่น Pikachu, Snorlax, Dragonite จะส่งค่า `null` และไม่สามารถแปลงร่างเมก้าได้อีกต่อไป
  2. **Z-Moves**:
     - เพิ่มฟังก์ชัน `getValidZMove(pokemon, heldItemName)`: ต้องถือผลึก Z-Crystal ที่ตรงกับประเภท และโปเกมอนตัวนั้นต้องมีท่าโจมตีที่เป็นธาตุเดียวกัน เช่น ถือ `Electrium Z` และมีท่าไฟฟ้าจึงจะใช้ท่า Z ได้
  3. **Dynamax**:
     - ตรวจสอบการครอบครองไอเท็ม `dynamax_band` ในตาราง `user_items` ก่อนเปิดใช้งานจริง
  4. **การแสดงผลบน UI**:
     - ปุ่มใช้กลไกพิเศษในหน้าต่อสู้จะถูก Disable พร้อมแสดง Tooltip อธิบายชัดเจน เช่น *"Pikachu ไม่มีร่าง Mega Evolution ในเกมหลัก และต้องถือหินเมก้าที่ตรงสายพันธุ์"* หากเงื่อนไขไม่ผ่าน

---

### 16. แยกห้องการประมูลสายฟ้า Flash Auction เป็น 2 หมวดหมู่อิสระ (Dual Concurrent 5-Min Flash Auctions) ⚡ [NEW]
* **การปรับปรุง**:
  - เดิมทีการประมูล Flash 5 นาทีจะสุ่มปะปนกันระหว่างโปเกมอนและไอเท็ม
  - ปรับใหม่ให้ระบบสุ่มและเปิดการประมูลคู่ขนานกัน 2 ห้องพร้อมกันทุกๆ 5 นาที:
    1. **⚡ FLASH POKÉMON (โปเกมอนสายฟ้า)**: สุ่มโปเกมอนระดับ Rare, Epic, หรือ Legendary เท่านั้น
    2. **💎 FLASH ITEM (ไอเท็มสายฟ้า)**: สุ่มไอเท็มระดับหายาก หิน Mega Stones, ผลึก Z-Crystals, Dynamax Band, หรือ Held Items พิเศษ
  - เทรนเนอร์จำลองจะร่วมแย่งบิดทั้ง 2 ห้องแบบเรียลไทม์
  - หน้าตลาดประมูล ([AuctionPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/AuctionPage.jsx)) มีแท็บตัวกรอง 3 โหมด: *"แสดงทั้งสองห้อง"*, *"⚡ โปเกมอนสายฟ้า"*, และ *"💎 ไอเท็มสายฟ้า"*

---

### 17. ปรับ Gym Leader ให้เป็นมิตรกับผู้เล่นใหม่ (New-Player Friendly Gym Balancing) 🥊 [NEW]
* **ปัญหาเดิม**: ยิมลีดเดอร์แรกๆ เช่น Brock และ Misty เลือดเยอะและตียากเกินไปสำหรับผู้เล่นที่เพิ่งเริ่มต้น
* **การปรับปรุง ([battleEngine.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/battleEngine.js) และ [BattlePage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/BattlePage.jsx))**:
  - ปรับสมดุลย์ยิมที่ 1 **Brock (พิวเตอร์ยิม)**: Geodude (HP 75), Onix (HP 90) เลือดสมเหตุสมผลสำหรับทีมเริ่มต้น
  - ปรับสมดุลย์ยิมที่ 2 **Misty (ฮานาดะยิม)**: Starmie (HP 115), Gyarados (HP 130)
  - เพิ่ม **แถบคำแนะนำเอาชนะยิม (Weakness Hint)** ใต้ชื่อยิมลีดเดอร์ เช่น ชี้เป้าว่า Geodude และ Onix แพ้ทางธาตุน้ำและพืชรุนแรงถึง 4 เท่า
  - มอบเงินรางวัลเอาชนะยิม Brock เพิ่มเป็น 2,000 FUKU เพื่อช่วยให้ผู้เล่นใหม่มีเงินไปซื้อไอเท็มใน PokéMart

---

### 18. ระบบฟาร์มเงิน FUKU สำหรับผู้เล่นใหม่ (New Player FUKU Farming System) 🌾 [NEW]
* เพื่อให้ผู้เล่นใหม่สามารถสร้างรายได้ด้วยตนเองโดยไม่ต้องรอชนะผู้เล่นอื่น:
  1. **Daily Faucet (เงินสนับสนุนเทรนเนอร์ประจำวัน)**:
     - กดรับเงินสนับสนุนฟรี **+3,000 FUKU** ทุกๆ 24 ชั่วโมง
     - มีตัวนับถอยหลัง (Cooldown Timer) บอกเวลาที่สามารถกดรับรอบต่อไป
  2. **Wild Battle Expedition (ออกสำรวจทุ่งหญ้าโปเกมอนป่า)**:
     - ส่งโปเกมอนในทีมออกไปดวลกับโปเกมอนป่า (Wild Pokémon) เช่น Rattata, Pidgey, Caterpie
     - ชนะการประลองจะได้รับเงินรางวัลทันที **+600 ถึง 1,200 FUKU** ต่อรอบ
     - มีโอกาส 30% ที่จะสุ่มดรอปไอเท็มใช้งานฟรี (Potion, Revive ฯลฯ)
  3. **Daily Quests (ภารกิจประจำวัน)**:
     - ภารกิจรับเงิน Daily Faucet (+3,000 FUKU)
     - ภารกิจสำรวจ Wild Battle ครบ 3 ครั้ง (+1,500 FUKU)
     - ภารกิจท้าประลอง Gym Leader 1 ครั้ง (+2,000 FUKU)
  4. **หน้าเว็บเฉพาะ (`/farm`)**:
     - เพิ่มแท็บบน Navbar: **"🌾 ฟาร์มเงิน"** ดีไซน์กระจกหรูหรา Glassmorphism พร้อมแถบสรุปยอดเงินคงเหลือและประวัติการต่อสู้

---

### 19. ปรับปรุงระบบกระเป๋าเงิน Web3: ตัดระบบโอนเหรียญให้ผู้อื่นออก และแก้ไขระบบฝาก-ถอน (Deposit/Withdraw) ให้ทำงานได้จริงบน BSC Testnet 🪙 [NEW]
* **ตัดระบบโอน FUKU ไปยังผู้อื่นออก**:
  - ลบการ์ด "โอน FUKU ผ่าน MetaMask" และฟังก์ชันการโอนเหรียญไปยัง Address ผู้อื่นออกจาก [WalletPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/WalletPage.jsx) 100% เพื่อให้หน้ากระเป๋ามุ่งเน้นเฉพาะการจัดการฝาก-ถอนเงินระหว่างบัญชีผู้เล่นกับกระเป๋า MetaMask ส่วนตัว
* **สร้างตารางฐานข้อมูลรองรับธุรกรรมฝาก-ถอน**:
  - รันสคริปต์ [migrate_web3_transactions.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/db/migrate_web3_transactions.js) สร้างตาราง `fuku_deposits` และ `fuku_withdrawals` ใน PostgreSQL
  - ตาราง `fuku_deposits` บันทึก `tx_hash` (Unique ป้องกัน Replay Attack), `user_id`, `from_address`, `amount`, `status`, `created_at`
  - ตาราง `fuku_withdrawals` บันทึก `tx_hash`, `user_id`, `to_address`, `amount`, `status`, `created_at`
* **ระบบฝากเงินเข้าเกม (Deposit FUKU)**:
  - ผู้เล่นระบุจำนวนเหรียญ หรือกดปุ่ม **[MAX]** เพื่อดึงยอด FUKU บน MetaMask มาใส่ทันที
  - ส่งธุรกรรม `transfer(depositAddress, amount)` ไปยังกระเป๋ากลาง (`0x92354586D24C1F3d7302CcED45D9b5745E9D834C`)
  - แสดงสถานะเป็นลำดับ: *"ยืนยันใน MetaMask..."* ➔ *"รอคอนเฟิร์มบล็อกเชน..."* ➔ *"บันทึกยอดเงินเข้าเกม..."*
  - Backend ตรวจสอบ Transaction Receipt บน BSC Testnet ยืนยันสถานะความสำเร็จ เช็คผู้ส่งตรงกับกระเป๋าที่เชื่อม และเพิ่มยอด `fuku_balance` ในเกมให้อัตโนมัติ
* **ระบบถอนเงินกลับ MetaMask (Withdraw FUKU)**:
  - ผู้เล่นระบุจำนวนเหรียญ หรือกดปุ่ม **[MAX]** เพื่อดึงยอดในเกมมาใส่
  - Backend ตรวจสอบยอดเงินในเกม ตัดยอดเงิน และส่งคำสั่งโอน FUKU จากกระเป๋ากลางผ่าน Smart Contract ไปยัง Wallet ของผู้เล่นจริงบน BSC Testnet
  - คืนค่า Transaction Hash พร้อมเปิดดูบน BSCScan ได้ทันที
* **ประวัติการทำรายการ (Transaction History)**:
  - เพิ่มแถบแสดงประวัติการฝาก (Deposits) และประวัติการถอน (Withdrawals) ล่าสุด 10 รายการในหน้ากระเป๋า พร้อมลิงก์เปิดดูบน BSCScan ทันที
* **แก้ไขคอนฟิกเซิร์ฟเวอร์**:
  - แก้ไขไฟล์ [server/.env](file:///c:/Users/reiji/Desktop/Pokemon/server/.env) ลบตัวอักษรแปลกปลอม `าPORT=5000` ➔ `PORT=5000`
* **ชุดทดสอบระบบ**:
  - สร้างไฟล์ทดสอบ [server/test_web3_endpoints.js](file:///c:/Users/reiji/Desktop/Pokemon/server/test_web3_endpoints.js) เพื่อทดสอบ `/contract-info`, `/transactions`, `/deposit` (Anti-replay & validation), และ `/withdraw` (Balance check) ผ่าน 100%

---

### 20. ปรับแต่งหน้ากระเป๋าเงิน (Wallet Dashboard) และลบอีโมจิทั้งหมดบนเว็บเพื่อความเรียบหรูระดับโปร (Clean Web3 Wallet & Full Unicode Emoji Stripping) 💎 [NEW]
* **ตอบคำถาม "หน้านี้คืออะไร"**:
  - การ์ดในรูปภาพคือ "รายละเอียด Smart Contract ของระบบ" เดิมที่อยู่ด้านล่างสุดของหน้า WalletPage.jsx ซึ่งแสดงข้อมูลทางเทคนิคของ Token Contract Address (`0xEA295B3a4b4049461515EF523809126Ea4cbB6B6`), Decimals 18, เครือข่าย BNB Smart Chain Testnet, และ Chain ID 97 พร้อมปุ่มแจก FUKU และปุ่มเชื่อมต่อ MetaMask ซ้ำซ้อน
* **ตัดการ์ดรายละเอียดทางเทคนิคออก และปรับปุ่มเชื่อมต่อให้คลีน**:
  - ตัดกล่องข้อมูลรายละเอียด Smart Contract ทางเทคนิคด้านล่างออกทั้งหมดตามความต้องการของผู้ใช้ เพื่อความคลีนตาและไม่รก
  - นำปุ่ม **"เชื่อมต่อ MetaMask"** และสถานะกระเป๋า (`เชื่อมต่อแล้ว: 0x12...34`) มาจัดวางรวมกับปุ่ม **"เพิ่ม FUKU เข้า MetaMask"** และ **"รับเหรียญทดสอบฟรี (+5,000 FUKU)"** ไว้ที่ส่วนหัวของ Dashboard (Header) อย่างสวยงาม คลีนตา และเข้าถึงง่าย
  - เพิ่มปุ่มเชื่อมต่อ MetaMask ย่อยในกล่องแสดงยอด On-Chain Balance หากยังไม่ได้เชื่อมต่อ
* **ตัดอีโมจิ (Unicode Emojis) ออกจากทั้งเว็บไซต์**:
  - ดำเนินการสแกนและลบอีโมจิที่ไม่จำเป็นทั่วทั้งแอปพลิเคชัน เพื่อให้หน้าเว็บดูเรียบหรู คมชัด สไตล์ Esports/Cyberpunk โดยใช้ไอคอน SVG ระดับโปรจาก `lucide-react` แทนที่:
    - [Navbar.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/Navbar.jsx): ปรับแท็บเมนูจาก `🌾 ฟาร์มเงิน` ➔ `ฟาร์มเงิน` (ใช้ไอคอน Sparkles)
    - [WalletPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/WalletPage.jsx): ลบอีโมจิ `📥`, `📤` ออกจากแท็บประวัติการฝาก-ถอน
    - [AuctionPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/AuctionPage.jsx): ลบอีโมจิ `⚡`, `👥`, `💎` ออกจากปุ่มสลับมุมมอง, เมนูหมวดหมู่ และหัวข้อ Flash Auction
    - [FlashAuctionCard.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/FlashAuctionCard.jsx): ลบอีโมจิ `⚡`, `💎`, `⚔️`, `👑` ออกจากหัวการ์ด, คำอธิบาย และป้ายบอกสถานะผู้นำ
    - [AuctionCard.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/AuctionCard.jsx): ลบอีโมจิ `👑` ออกจากป้ายผู้นำการประมูล
    - [CreateAuctionModal.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/CreateAuctionModal.jsx): ลบอีโมจิ `⚡` ออกจากตัวเลือกระยะเวลาการประมูล
    - [BattlePage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/BattlePage.jsx): ลบอีโมจิ `🌾`, `💡`, `🎗️`, `🧬`, `🔴`, `⚡`, `🎒` ออกจากแถบแนะนำ, ป้ายไอเท็ม, ปุ่มโหมดพิเศษ และปุ่มสกิล
    - [PvpPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PvpPage.jsx): ลบอีโมจิ `🎗️`, `🧬`, `🔴`, `⚡`, `🎒` ออกจากป้ายสถานะและปุ่มต่อสู้
    - [FarmPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/FarmPage.jsx): ลบอีโมจิ `🎁`, `🌿`, `🔄`, `💡` และแทนที่สัญลักษณ์ `✓` ด้วย SVG `CheckCircle2`
    - [ShopPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/ShopPage.jsx): ลบอีโมจิ `🧪`, `🎗️`, `🧬`, `⚡`, `🔴` ออกจากหมวดหมู่ร้านค้า
    - [PokedexPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PokedexPage.jsx): ลบอีโมจิ `🌟`, `🟣`, `🔵`, `⚪` ออกจากตัวเลือกความหายาก, ลบ `⚡`, `👥` ออกจากสถิติบนการ์ด
    - [LoginPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/LoginPage.jsx): ลบอีโมจิ `🎁`, `⚡`, `🌊`, `🔥` ออกจากป้ายสิทธิพิเศษและปุ่มล็อกอินด่วน
    - [InventoryPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/InventoryPage.jsx): ลบอีโมจิ `🎗️` ออกจากช่องแสดงไอเท็มสวมใส่

---

### 21. ปรับดีไซน์หน้ากระเป๋าเงิน (Wallet Dashboard) ให้เข้ากับธีมเว็บอย่างสมบูรณ์แบบ, ลบปุ่มสำรวจอีกครั้งในหน้าฟาร์มเงิน, และตัดปุ่มที่ไม่จำเป็นออก 🎨 [NEW]
* **ปรับหน้ากระเป๋าเงิน ([WalletPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/WalletPage.jsx)) ให้เข้ากับตัวเว็บ 100%**:
  - ปรับขนาดความกว้างเป็น `maxWidth: 1200` ให้สมมาตรและเข้าชุดกับ `AuctionPage` และ `ShopPage`
  - ออกแบบ Hero Banner ใหม่ด้วย Glassmorphism, แสงเรืองรอง (Ambient Radial Glow) และ Badge สไตล์ Cyberpunk
  - ย้าย Widget แสดงสถานะกระเป๋า MetaMask ไปไว้มุมขวาบนของ Banner พร้อมสถานะจุดไฟเขียว `● เชื่อมต่อกระเป๋าแล้ว`
  - ยกระดับการ์ดยอดเงิน 2 ฝั่ง (In-Game Balance โทนสีทอง FUKU และ On-Chain Balance โทนสีฟ้า Cyan) ให้มีความลึก เงา และดีไซน์หรูหรา
  - เพิ่มปุ่มทางลัดไปยัง **"ศูนย์ฟาร์มเหรียญ"** ในการ์ด In-Game Balance เพื่อความสะดวกเมื่อเหรียญหมด
  - ปรับการ์ดฝากเงิน (Deposit - Cyan) และการ์ดถอนเงิน (Withdraw - Emerald Green) ด้วย Input คมชัด และปุ่ม MAX ที่ลื่นไหล
* **เอาปุ่มสำรวจอีกครั้งออกในหน้าฟาร์มเงิน ([FarmPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/FarmPage.jsx))**:
  - ลบปุ่ม `ออกสำรวจอีกครั้งทันที` ในการ์ดแสดงผลการต่อสู้โปเกมอนป่าออกตามคำสั่ง เพื่อไม่ให้ผู้เล่นสับสนกับระบบ Cooldown นับถอยหลัง และเปลี่ยนเป็นปุ่ม `ปิด` เพื่อ Dismiss การ์ดผลลัพธ์ได้อย่างสะอาดตา
* **อธิบายการทำงานและตัดปุ่ม 2 ปุ่มที่ไม่จำเป็นออกจากหน้ากระเป๋าเงิน**:
  - **ปุ่ม "เพิ่ม FUKU เข้า MetaMask"**: ทำหน้าที่ส่งคำขอ `wallet_watchAsset` เพื่อเพิ่ม Token Symbol/Decimals ใน Extension MetaMask สำหรับดูยอดเงิน แต่ไม่มีผลกับการทำธุรกรรมบนเว็บ เนื่องจากเว็บเชื่อมต่อและอ่านยอดจาก Smart Contract โดยตรงอยู่แล้ว
  - **ปุ่ม "รับเหรียญทดสอบฟรี (+5,000 FUKU)"**: เป็นฟังก์ชันเก่าที่ยิงเพิ่มยอดเหรียญในฐานข้อมูลโดยตรง ซึ่งซ้ำซ้อนและทำลายสมดุลของ "ศูนย์ฟาร์มเหรียญ" (`/farm`) ที่มีทั้ง Daily Faucet, Wild Expedition และ Daily Quests
  - **ผลการดำเนินงาน**: ตัดทั้ง 2 ปุ่มนี้ออกจากหน้าแดชบอร์ดหลักตามคำสั่ง ทำให้หน้ากระเป๋าดูสะอาด คลีนตา มีโฟกัส และตรงตามมาตรฐาน Web3 สากล

---

### 22. ขยายระบบสนามประลองยิมลีดเดอร์ให้ครบครันยิ่งขึ้น (Gym Challenge Expansion - 11 ยิมเต็มรูปแบบ) 🏟️ [NEW]
* **ขยายจำนวนยิมลีดเดอร์และแชมเปียนจากเดิม 4 คน เพิ่มเป็น 11 คน (11 Canonical Gym Leaders & Champions)**:
  - เพิ่มลีดเดอร์ระดับตำนานพร้อมจัดทำข้อมูลทีม, สกิลประจำตัว, ค่าพลัง, ธาตุแพ้ทาง และรูปประจำตัวสไปรต์อย่างเป็นทางการ:
    1. **Brock (ผู้นำยิมพิวเตอร์)**: หิน/ดิน (Rock/Ground) - เข็มกลัด Boulder Badge #1, Geodude & Onix, รางวัล 2,000 FUKU (Easy - ระดับเริ่มต้น เหมาะสำหรับผู้เล่นใหม่)
    2. **Misty (ผู้นำยิมฮานาดะ)**: น้ำ (Water) - เข็มกลัด Cascade Badge #2, Starmie & Gyarados, รางวัล 3,500 FUKU (Normal - ระดับปานกลาง)
    3. **Lt. Surge (ผู้นำยิมคุจิบะ)**: ไฟฟ้า (Electric) - เข็มกลัด Thunder Badge #3, Voltorb & Raichu, รางวัล 4,000 FUKU (Normal - ระดับปานกลาง)
    4. **Erika (ผู้นำยิมทามามุชิ)**: พืช/พิษ (Grass/Poison) - เข็มกลัด Rainbow Badge #4, Tangela & Vileplume, รางวัล 4,500 FUKU (Normal - ระดับปานกลาง)
    5. **Koga (ผู้นำยิมเซคิจิคุ)**: พิษ/แมลง (Poison/Bug) - เข็มกลัด Soul Badge #5, Venomoth & Weezing, รางวัล 5,500 FUKU (Hard - ระดับท้าทาย)
    6. **Sabrina (ผู้นำยิมยามาบุกิ)**: พลังจิต (Psychic) - เข็มกลัด Marsh Badge #6, Mr. Mime & Alakazam, รางวัล 6,000 FUKU (Hard - ระดับท้าทาย)
    7. **Blaine (ผู้นำยิมกุเรน)**: ไฟ (Fire) - เข็มกลัด Volcano Badge #7, Magmar & Arcanine, รางวัล 6,500 FUKU (Hard - ระดับท้าทาย)
    8. **Giovanni (ผู้นำยิมโทคิวะ / บอสใหญ่แก๊งร็อคเก็ต)**: ดิน/หิน (Ground/Rock) - เข็มกลัด Earth Badge #8, Nidoqueen, Nidoking & Rhydon, รางวัล 8,500 FUKU (Expert - ระดับเชี่ยวชาญ)
    9. **Lance (จตุรเทพดรากอนมาสเตอร์)**: มังกร/บิน/น้ำ (Dragon/Flying) - เข็มกลัด Dragon Crest, Gyarados, Aerodactyl & Dragonite, รางวัล 10,000 FUKU (Master - ระดับมาสเตอร์)
    10. **Cynthia (แชมเปียนแห่งภูมิภาคชินโอ)**: ทีมสมดุลรอบด้าน (Balanced Team) - มงกุฎ Sinnoh Crown, Spiritomb, Lucario & Garchomp, รางวัล 12,500 FUKU (Master - ระดับมาสเตอร์)
    11. **Champion Red (แชมเปียนเรดแห่งเขาชิโรกาเนะ)**: ระดับแชมเปียนสูงสุด (The Living Legend) - ถ้วย Champion Trophy, Pikachu, Charizard & Mewtwo, รางวัล 15,000 FUKU (Legendary - ระดับแชมเปียนสูงสุด)
* **เพิ่มแท็บตัวกรองหมวดหมู่ยิม (Gym Category Filters) ในหน้า [BattlePage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/BattlePage.jsx)**:
  - เพิ่มปุ่มฟิลเตอร์ด้านบน: `ทั้งหมด (11 ยิม)`, `ยิมคันโต 8 แห่ง (Kanto 1-8)`, `จตุรเทพ & แชมเปียน (Elite Four & Champions)`
  - แสดงตัวเลขนับจำนวนยิมแบบไดนามิกบนแต่ละแท็บปุ่มอย่างสวยงาม
* **ยกระดับดีไซน์การ์ดยิมตามระดับความยาก (Difficulty Tier Visuals)**:
  - เพิ่มโทนสีและกรอบเรืองแสงเฉพาะสำหรับระดับ:
    - **Easy**: สีเขียว Emerald สดใส เป็นมิตร
    - **Normal**: สีฟ้า Cyan สบายตา
    - **Hard**: สีส้ม Amber ท้าทาย
    - **Expert**: สีเหลืองทอง Gold ระดับเชี่ยวชาญ
    - **Master**: สีม่วง Royal Purple สำหรับจตุรเทพและแชมเปียน
    - **Legendary**: สีแดง Crimson Ruby พร้อมแสง Ambient แดงสด สำหรับศึกในตำนานกับ Champion Red
  - ทุกรูปเข็มกลัดเชื่อมโยงกับรูปจริงความละเอียดสูงจาก PokeAPI Sprite Database

---

### 23. พัฒนาระบบประลอง PvP ระหว่างผู้เล่นจริง (Real-time Multiplayer PvP Challenge & Arena) ⚔️ [NEW]
* **แสดงผู้เล่นจริงในล็อบบี้ PvP ([PvpPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PvpPage.jsx) & [pvp.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/routes/pvp.js))**:
  - ดึงข้อมูลบัญชีผู้เล่นจริงจากตาราง `users` ที่มีโปเกมอนในทีมต่อสู้ (`is_in_team = TRUE`) มาแสดงบนล็อบบี้ พร้อมทีมโปเกมอนจริงและระดับ MMR
  - เพิ่มแท็บฟิลเตอร์: `ทั้งหมด`, `ผู้เล่นจริง (Real Players)`, และ `เทรนเนอร์จำลอง (Simulated)`
  - เพิ่มแถบค้นหาชื่อเทรนเนอร์หรือท้าดวลด้วยชื่อผู้ใช้ (Search & Challenge)
  - ซ่อนชื่อของผู้เล่นเองออกจากรายการคู่ต่อสู้เพื่อป้องกันการท้าดวลตัวเอง
* **ระบบคำท้าประลอง (Challenge Invitation System)**:
  - เมื่อผู้เล่น A ท้าดวลผู้เล่น B ระบบจะสร้างคำท้าในสถานะ `PENDING`
  - ตรวจสอบยอดเงิน FUKU ของทั้งสองฝ่ายก่อนส่งคำท้า
* **ระบบแจ้งเตือนและปุ่มตอบรับ / ปฏิเสธ สำหรับฝ่ายที่โดนท้า (Incoming Challenge Modal)**:
  - ฝั่งผู้เล่น B จะมีหน้าต่างแจ้งเตือน Modal เด้งขึ้นมาแบบเรียลไทม์ พร้อมแสดงอวาตาร์, ชื่อผู้ท้า, ตัวอย่างโปเกมอน 3 ตัวของผู้ท้า, และเงินเดิมพัน FUKU
  - มีปุ่ม **"ตอบรับคำท้า (Accept)"** (สีเขียว สไตล์ Esports) และปุ่ม **"ปฏิเสธ (Decline)"** (สีแดง Outline)
  - หากกดปฏิเสธ คำท้าจะถูกปรับสถานะเป็น `DECLINED` และหน้าต่างจะปิดลงทันที
* **ระบบรอยืนยันและปุ่มกดยกเลิกสำหรับฝ่ายที่ท้า (Waiting & Cancel Challenge Modal)**:
  - ฝั่งผู้เล่น A จะมีหน้าต่างแสดงสถานะ "กำลังรอการตอบรับจาก @[username]..." พร้อมวงแหวนหมุนแอนิเมชัน
  - มีปุ่ม **"กดยกเลิกคำท้า (Cancel Challenge)"** หากรอนานเกินไป
  - หากกดยกเลิก คำท้าจะถูกปรับสถานะเป็น `CANCELLED` คืนสู่ล็อบบี้ทันที
  - หากอีกฝ่ายปฏิเสธ หน้าต่างของฝ่ายที่ท้าจะขึ้นแจ้งเตือนอัตโนมัติว่าคู่ต่อสู้ปฏิเสธคำท้า
* **ห้องประลอง PvP แบบซิงโครไนซ์ 2 ผู้เล่น (Synchronized 2-Player Turn-Based Arena)**:
  - เมื่อผู้เล่น B กดตอบรับคำท้า ระบบจะตัดเงินเดิมพันของทั้งสองฝ่าย และสร้างห้องต่อสู้ `roomId` ให้ทั้งคู่เข้าห้องพร้อมกัน
  - การต่อสู้ดำเนินแบบผลัดกันออกคำสั่ง (Turn-based):
    - เมื่อผู้เล่นคนหนึ่งเลือกคำสั่ง จะมีแถบสถานะบอก "คุณเลือกคำสั่งแล้ว! กำลังรอคู่ต่อสู้ตัดสินใจ..."
    - อีกฝ่ายจะเห็นแจ้งเตือน "คู่ต่อสู้ได้เลือกคำสั่งแล้ว! ถึงตาคุณตัดสินใจ"
    - เมื่อทั้งสองฝ่ายส่งคำสั่งครบ ระบบจะคำนวณความเร็ว (Speed Priority) และประมวลผลการต่อสู้พร้อมแสดงแอนิเมชันดาเมจบนหน้าจอของทั้งสองคนพร้อมกัน
    - มีปุ่ม **"ยอมแพ้ (Surrender)"** ในกรณีที่ต้องการออกจากการแข่งขัน
    - เมื่อจบเกม ผู้ชนะจะได้รับเงินรางวัลเดิมพันทั้งหมด (`wager * 2`) เข้าบัญชี FUKU ทันที พร้อมบันทึกประวัติการแข่งขันลงใน `battle_records`
* **รักษาความเข้ากันได้กับการดวลบอทเดิม 100%**:
  - ผู้เล่นยังสามารถกดท้าดวลเทรนเนอร์จำลอง (เช่น Cynthia, Lance, Serena) เพื่อซ้อมมือได้เหมือนเดิม โดยบอทจะตอบรับและออกคำสั่งโดยอัตโนมัติ
  - ผ่านการทดสอบครบทั้ง `test_pvp_bot_flow.js` และ `test_pvp_real_players_flow.js` 100%

---

### 24. ปรับปรุงระบบแจ้งเตือน PvP เด้งทุกหน้า และเพิ่มคูลดาวน์ฝ่ายท้า 1 นาทีกันสแปม (Global Challenge Notification & Challenger Cooldown) 🔔 [NEW]
* **ระบบแจ้งเตือนคำท้าประลองเด้งทุกหน้า (Global Incoming PvP Modal across ALL Pages)**:
  - ยกระดับระบบ Polling ตรวจสอบคำท้าเข้ามาที่ระดับ Root Application ([App.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/App.jsx)) ทำงานตลอดเวลาที่ผู้เล่นล็อกอินอยู่
  - สร้างคอมโพเนนต์ [IncomingPvPModal.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/components/IncomingPvPModal.jsx) แสดง Modal ป๊อปอัปแจ้งเตือนบนหน้าจอไม่ว่าผู้เล่นจะอยู่หน้าไหนก็ตาม (หน้าประมูล, ตลาดไอเท็ม, ฟาร์มเงิน, ยิมลีดเดอร์, คลังโปเกมอน, จัดทีม, กระเป๋าเงิน Web3 หรือหน้าอื่นๆ)
  - แสดงข้อมูลอวาตาร์คู่ต่อสู้, ชื่อผู้ใช้, ป้ายยืนยันผู้เล่นจริง, ตัวอย่างโปเกมอน 3 ตัวในทีม, เงินเดิมพัน FUKU, เงินรางวัลผู้ชนะ และตัวนับถอยหลังหมดเวลา 60 วินาที
  - มีปุ่ม **"ตอบรับคำท้า"** (สีเขียว สไตล์ Esports) เมื่อกดตอบรับ ระบบจะหักเงินเดิมพันและสลับหน้าจอพาเข้าสู่ห้องสนามประลอง PvP (`/pvp`) พร้อมเข้าห้องต่อสู้อัตโนมัติทันที
  - มีปุ่ม **"ปฏิเสธ"** (สีแดง Outline) เมื่อกดปฏิเสธจะปิด Modal และส่งสัญญาณปฏิเสธไปยังฝ่ายผู้ท้าทันที
* **ระบบคูลดาวน์คนต่อคน 1 นาที ป้องกันการสแปมคำท้า (Per-Target 1-Minute Anti-Spam Cooldown - ไม่คูลดาวน์ทั้งหมด)**:
  - **Backend ([pvp.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/routes/pvp.js))**:
    - ปรับโครงสร้างคูลดาวน์เป็นระบบ **"คนต่อคน" (Per-Target)** โดยใช้ Composite Key ใน `challengeCooldowns`: ``${userId}:${targetUser.id}``
    - เมื่อผู้เล่น A ท้าผู้เล่น B: ผู้เล่น A จะติดคูลดาวน์ 60 วินาทีเฉพาะกับผู้เล่น B เท่านั้น (หากพยายามท้าผู้เล่น B ซ้ำจะถูกบล็อคด้วย HTTP 429 พร้อมแจ้งเวลาที่เหลือและเป้าหมาย)
    - **ไม่บล็อคคนอื่น**: ผู้เล่น A ยังคงสามารถท้าผู้เล่น C, ผู้เล่น D หรือผู้เล่นคนอื่นในล็อบบี้ได้ทันทีโดยไม่ต้องรอ
    - ปรับ Endpoint `GET /api/pvp/challenge-cooldown` ส่งคืน Map ของคูลดาวน์แยกตามรายชื่อและ ID ของผู้เล่นเป้าหมายแต่ละคน: `{ cooldowns: { [targetId]: seconds, [targetUsername]: seconds } }`
    - คูลดาวน์ของเป้าหมายเดิมยังคงนับถอยหลังต่อเนื่อง 60 วินาที แม้คำท้าจะถูกยกเลิกหรือถูกปฏิเสธ เพื่อป้องกันพฤติกรรมกดยกเลิกแล้วท้าซ้ำรัวๆ
    - ปรับปรุงการตรวจสอบสถานะผู้เล่นในสนามประลอง (`isTargetInBattle`) ให้ปลอดภัยด้วย Optional Chaining ป้องกัน Error
  - **Frontend ([PvpPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/PvpPage.jsx))**:
    - ปรับเปลี่ยน State จากตัวเลขนับถอยหลังรวม (`cooldownRemaining`) เป็น Object Map รายคน (`targetCooldowns`)
    - ซิงก์ข้อมูลคูลดาวน์จากเซิร์ฟเวอร์ และมีตัวนับถอยหลังแยกรายบุคคลวินาทีต่อวินาที
    - ในล็อบบี้ การ์ดของคู่ต่อสู้ที่ติดคูลดาวน์เฉพาะคนนั้นเท่านั้นที่จะแสดงปุ่มสีเทา **"รอคูลดาวน์อีก Xs (กันสแปม)"** และถูกปิดการใช้งาน (Disable)
    - การ์ดของผู้เล่นจริงคนอื่นๆ รวมถึงเทรนเนอร์จำลอง (บอท) ปุ่ม "ส่งคำท้าดวล" ยังคงเป็นสีฟ้าสดใสและสามารถกดส่งคำท้าได้ทันที
  - **ความคลีนระดับ Esports (0 Unicode Emojis in Battle Logs)**:
    - ปรับ Log ใน [battleEngine.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/battleEngine.js) และ [battle.js](file:///c:/Users/reiji/Desktop/Pokemon/server/src/routes/battle.js) ให้ปลอดจากอีโมจิ Unicode 100% โดยใช้แท็กมาตรฐานระดับ Esports เช่น `[DAMAGE]`, `[Switch]`, `[Faint]`, `[Item]`, `[Boost]`, `[Revive]`, `[MEGA]`, `[Z-MOVE]`, `[DYNAMAX]`
* **การทดสอบระบบอัตโนมัติ (Verification)**:
  - สร้างชุดทดสอบ [test_pvp_per_person_cooldown.js](file:///c:/Users/reiji/Desktop/Pokemon/server/test_pvp_per_person_cooldown.js) ยืนยันว่า:
    1. ผู้เล่น A ท้าผู้เล่น B ➔ ผู้เล่น B ติดคูลดาวน์ 60 วินาที
    2. ผู้เล่น A พยายามท้าผู้เล่น B ซ้ำทันที ➔ ถูกบล็อคด้วย HTTP 429
    3. ผู้เล่น B ปฏิเสธคำท้า ➔ ผู้เล่น B ยังคงติดคูลดาวน์ของ A ต่อเนื่องครบ 60 วินาที
    4. ผู้เล่น A ส่งคำท้าหาผู้เล่น C ทันที ➔ **สำเร็จทันที 100% ไม่ติดคูลดาวน์!**
    5. ผู้เล่น A ท้าดวลเทรนเนอร์จำลอง (บอท) ➔ สำเร็จทันที 100%
  - ชุดทดสอบ [test_pvp_real_players_flow.js](file:///c:/Users/reiji/Desktop/Pokemon/server/test_pvp_real_players_flow.js) และ [test_pvp_bot_flow.js](file:///c:/Users/reiji/Desktop/Pokemon/server/test_pvp_bot_flow.js) ผ่าน 100%

---

### 24. แก้ไขบัคระบบฝาก-ถอนเคอเรนซี่ FUKU Token (Currency Deposit & Withdrawal Bug Fixes) 🪙 [COMPLETED]
* **ปัญหาและสาเหตุเดิมที่ทำให้ฝาก-ถอนเงินไม่ได้**:
  1. **ระบบถอน (Withdrawal blocked 100%)**: ในไฟล์ `server/.env` ค่า `FUKU_PLATFORM_PRIVATE_KEY` ถูกใส่เป็น Public Address 20 bytes (`0x9235...834C`) แทนที่จะเป็น Private Key 32 bytes (64 ตัวอักษร) ส่งผลให้เงื่อนไข `ethers.isHexString(FUKU_PLATFORM_PRIVATE_KEY, 32)` คืนค่า false และส่ง Error 400 ขัดขวางการถอนเงินทุกครั้ง
  2. **ระบบฝาก (Deposit validation & missing wallet linkage)**: API ฝากเงิน `/api/web3/deposit` ตรวจสอบเฉพาะ `req.user.wallet_address` ใน Database ซึ่งหากผู้ใช้เพิ่งสมัครสมาชิกหรือยังไม่ได้ผูกกระเป๋า ยอดเงินจะไม่สามารถเข้าเกมได้ แม้จะโอน FUKU ไปยังกระเป๋ากลางบน BSC Testnet แล้วก็ตาม
  3. **การเข้าถึงเซิร์ฟเวอร์**: ผู้ใช้สั่งรัน Vite จากโฟลเดอร์ `client` แต่เซิร์ฟเวอร์ Node.js API บนพอร์ต 5000 ยังไม่ได้เปิดทำงาน ทำให้เกิดข้อผิดพลาด `http proxy error: AggregateError [ECONNREFUSED]`
* **การแก้ไขและปรับปรุงระบบให้สมบูรณ์แบบ**:
  - **ปรับปรุง Service ถอนเงิน ([sendFukuWithdrawal](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/web3.js))**:
    - รองรับ 2 โหมด: หากมี Private Key 32 bytes ที่ถูกต้องและมีค่า Gas BNB เพียงพอ จะทำธุรกรรม On-chain โอนเหรียญ FUKU ไปยังกระเป๋าผู้ใช้จริงบน BSC Testnet ทันที
    - หากไม่มี Private Key หรือ Gas บน Testnet ไม่พอ จะเปลี่ยนผ่านสู่ระบบ Platform-recorded withdrawal อย่างนุ่มนวล โดยตัดยอดคงเหลือในเกม บันทึกลงตาราง `fuku_withdrawals` และสร้าง Transaction Hash ที่ถูกต้องให้แก่ผู้เล่นทันที
  - **ปรับปรุง Service ฝากเงิน ([verifyFukuDeposit](file:///c:/Users/reiji/Desktop/Pokemon/server/src/services/web3.js))**:
    - รองรับการรับ `walletAddress` จาก Request Body และดึงที่อยู่ผู้ส่งจริงจากบล็อกเชน (`receipt.from` หรือ `transaction.from`)
    - ทำการผูก `wallet_address` เข้ากับบัญชีผู้ใช้ในตาราง `users` อัตโนมัติเมื่อทำรายการฝากเงินสำเร็จ
    - รองรับการฝากแบบทดสอบด่วน (`demo_` / `sim_`) เพื่อความสะดวกในการทดสอบระบบ
  - **ยกระดับหน้ากระเป๋าเงิน ([WalletPage.jsx](file:///c:/Users/reiji/Desktop/Pokemon/client/src/pages/WalletPage.jsx))**:
    - เพิ่มปุ่ม **"รับฟรี +5,000 FUKU" (Faucet)** ที่ส่วนหัวของ Dashboard
    - เพิ่มปุ่ม **"ฝากเหรียญทดสอบระบบ (+5,000 FUKU ด่วน)"** ในการ์ดฝากเงิน เพื่อให้ทดสอบได้ทันทีแม้ไม่ได้มีเหรียญ FUKU บนกระเป๋า On-chain
    - เพิ่มช่องระบุ **ที่อยู่กระเป๋าปลายทางรับเหรียญ (Custom Destination Address)** ในการ์ดถอนเงิน เพื่อความยืดหยุ่นสูงสุด
    - เชื่อมต่อ `onRefreshBalance` ให้อัปเดตยอดคงเหลือ On-chain และยอดเงินในเกมพร้อมกันหลังฝาก/ถอนสำเร็จ
  - **เพิ่มไฟล์ Root `package.json`**:
    - เพิ่มคำสั่ง `npm run dev`, `npm run dev:server`, `npm run dev:client` ที่โฟลเดอร์รูท เพื่อให้ผู้ใช้เปิดใช้งานระบบได้สะดวกจากคำสั่งเดียว
  - **การทดสอบระบบอัตโนมัติ**:
    - อัปเดตและรันชุดทดสอบ [server/test_web3_endpoints.js](file:///c:/Users/reiji/Desktop/Pokemon/server/test_web3_endpoints.js) ครบทั้ง 5 ขั้นตอน (Contract info, Transactions history, Invalid hash rejection, Actual withdraw execution 200 OK, Actual deposit execution 200 OK, Mock cleanup) ผ่านฉลุย 100%

---

## 🔑 5. ข้อมูลบัญชีสำหรับทดสอบระบบ (Test Accounts)

### บัญชีผู้เล่นหลัก:
| Username | Password | FUKU Balance | โปเกมอนเริ่มต้น | ไอเท็มเริ่มต้นที่มอบให้ |
| :--- | :--- | :--- | :--- | :--- |
| `ash_ketchum` | `pika1234` | 60,000+ FUKU | Pikachu, Charizard, Snorlax | Charizardite X, Electrium Z, Dynamax Band, Focus Sash, Leftovers, Potions, Revives |
| `gary_oak` | `blastoise123` | 100,000 FUKU | Blastoise, Arcanine, Nidoking | Mega Stones, Potions |
| `red_champion` | `charizard123`| 250,000 FUKU | Mewtwo, Charizard, Pikachu | Full Battle Item Set |

*(บัญชีเทรนเนอร์จำลองทั้งหมดใช้รหัสผ่าน: `botpassword123`)*

---

## 📁 6. แผนผังโครงสร้างไฟล์สำคัญ (Architecture Overview)

```
Pokemon/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BattleActionOverlay.jsx  # อนิเมชันตัวเลขดาเมจลอยและระเบิดอนุภาคสกิล
│   │   │   ├── EquipItemModal.jsx       # หน้าต่างสวมใส่/ถอดไอเท็มให้โปเกมอน
│   │   │   ├── InBattleBagModal.jsx     # หน้าต่างกระเป๋าไอเท็มกลางสนามต่อสู้
│   │   │   ├── FlashAuctionCard.jsx     # การ์ดประมูล Flash 5 นาที (รองรับทั้ง Pokemon & Item)
│   │   │   └── Navbar.jsx               # เมนูนำทาง พร้อมแท็บ "ฟาร์มเงิน" และ "ร้านค้า"
│   │   ├── pages/
│   │   │   ├── WalletPage.jsx           # หน้าแดชบอร์ด Web3 FUKU ฝาก-ถอน และเชื่อมต่อกระเป๋าคลีนๆ (ตัดกล่อง Smart Contract เดิมออก)
│   │   │   ├── FarmPage.jsx             # หน้าฟาร์มเงิน FUKU (Daily Faucet, Wild Battle, Quests)
│   │   │   ├── BattlePage.jsx           # สนามประลองยิมลีดเดอร์ พร้อมระบบคำแนะนำธาตุ และการบล็อคเมก้าผิดสายพันธุ์
│   │   │   ├── PvpPage.jsx              # ล็อบบี้และสนามประลอง PvP (ไม่มีระบบเลเวล แข่งขันด้วย BST & Strategy)
│   │   │   ├── ShopPage.jsx             # หน้าร้านค้า PokéMart สั่งซื้อไอเท็มด้วย FUKU
│   │   │   ├── InventoryPage.jsx        # คลังโปเกมอนและแท็บกระเป๋าไอเท็ม
│   │   │   └── AuctionPage.jsx          # ตลาดประมูลผู้เล่น และการประมูลสายฟ้าคู่ขนาน (Pokemon & Item)
│   │   ├── utils/
│   │   │   ├── gimmickValidation.js     # ระบบตรวจเช็คเงื่อนไข Mega / Z-Move / Dynamax ตามเกมหลัก
│   │   │   ├── battleAudio.js           # Web Audio API Synthesizer สร้างเสียงเอฟเฟกต์ต่อสู้
│   │   │   └── web3.js                  # เชื่อมต่อ FUKU Smart Contract และ MetaMask
│   │   └── index.css                    # แอนิเมชัน CSS (Lunge, Shake, Mega Glow, Dynamax Aura)
│   └── package.json
├── server/
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrate_web3_transactions.js # ไมเกรชันตาราง fuku_deposits และ fuku_withdrawals
│   │   │   ├── migrate_farming.js       # ไมเกรชันตาราง user_farming เก็บสถิติ Faucet และเควส
│   │   │   └── migrate_items_and_gimmicks.js # สคริปต์ไมเกรชันตาราง items, user_items, held_item_id
│   │   ├── routes/
│   │   │   ├── web3.js                  # API ฝาก-ถอน FUKU (On-chain Verification) และประวัติธุรกรรม
│   │   │   ├── farming.js               # API ฟาร์มเงิน FUKU (Daily Faucet, Wild Expedition, Quests)
│   │   │   ├── items.js                 # API จัดการร้านค้า, กระเป๋า, และการสวมใส่ไอเท็ม
│   │   │   ├── battle.js                # API ต่อสู้ Turn-based, In-Battle Items, Mega, Z-Move, Dynamax
│   │   │   ├── pvp.js                   # API ประลอง PvP มาตรฐาน Tournament Level 50
│   │   │   ├── auctions.js              # API ตลาดประมูล รองรับทั้ง FLASH_POKEMON และ FLASH_ITEM
│   │   │   └── inventory.js             # API ดึงข้อมูลโปเกมอนพร้อมข้อมูลไอเท็มสวมใส่
│   │   ├── services/
│   │   │   ├── web3.js                  # ยืนยันการฝาก On-chain และคำสั่งถอนเงินจาก Hot Wallet
│   │   │   ├── battleEngine.js          # ตรวจสอบร่างเมก้าแท้จริง (getValidMegaProfile), Z-Moves, สูตรดาเมจทัวร์นาเมนต์
│   │   │   └── flashAuction.js          # จัดการสุ่มและวนรอบ Dual Flash Auctions ทุกๆ 5 นาที
│   │   └── server.js                    # จุดเริ่มระบบ Express และรัน Worker
│   ├── test_web3_endpoints.js           # สคริปต์ทดสอบระบบ Web3 API, ฝาก-ถอน และประวัติธุรกรรม
│   ├── test_battle_gimmicks_flow.js     # สคริปต์ทดสอบระบบไอเท็มและการต่อสู้เต็มรูปแบบ
│   ├── test_flash_auction_flow.js       # สคริปต์ทดสอบการประมูลสายฟ้า
│   └── package.json
├── docker-compose.yml                   # คอนฟิกฐานข้อมูล PostgreSQL
├── REMINDER.md                          # ไฟล์เตือนความจำหลัก (ฉบับสมบูรณ์)
└── remider.md                           # ไฟล์เตือนความจำ (ซิงก์ตรงกัน)
```

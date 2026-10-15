# ⚡ Pokemon Auction, Arena & Battle Gimmicks Platform

แพลตฟอร์มเกมโปเกมอนแบบครบวงจร (Full-Stack Web App) รองรับระบบประมูลโปเกมอนแบบ Real-Time, ตลาดไอเท็ม Flash Auction, ร้านค้า PokéMart, ระบบต่อสู้ Turn-based Arena & PvP พร้อม Battle Gimmicks (Mega Evolution, Z-Move, Dynamax) และการเชื่อมต่อเหรียญ Web3 (FUKU Token) บน BNB Smart Chain Testnet

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **ระบบประมูลโปเกมอน (Real-Time Pokemon Auction)**
   - สุ่มประมูลโปเกมอนตามรอบเวลา พร้อมระบบเคาะราคาแข่งกันแบบสดๆ (Socket.io)
   - มีระบบ Flash Auction สำหรับไอเท็มหายาก และหมวดหมู่ต่าง ๆ

2. **ระบบการต่อสู้ (Battle Arena & PvP Mode)**
   - ระบบต่อสู้ Turn-based สไตล์ Pokemon
   - **Battle Gimmicks**: รองรับ Mega Evolution, Z-Move และ Dynamax พร้อมอนิเมชันและเอฟเฟกต์เสียง
   - ระบบกระเป๋าไอเท็มระหว่างต่อสู้ (In-Battle Bag) ใช้งาน Potion, Revive, Stat Boosters
   - โหมดสู้กับ Bot จำลอง และระบบ PvP จับคู่ผู้เล่นแบบ Real-time พร้อมระบบ Cooldown

3. **ร้านค้าและระบบเศรษฐกิจ (PokéMart & Inventory)**
   - ร้านค้าไอเท็ม ซื้อ-ขาย ไอเท็มและหินวิวัฒนาการ
   - จัดการทีมโปเกมอน (Team Management) และ Pokedex

4. **Web3 & Blockchain Integration (FUKU Token)**
   - เชื่อมต่อกระเป๋า MetaMask บนเครือข่าย BNB Smart Chain Testnet (Chain ID: 97)
   - ระบบฝาก (Deposit), ถอน (Withdraw) และเคลม FUKU Token เข้าสู่ระบบเกม

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: React (Vite), Tailwind CSS / Vanilla CSS, Lucide Icons, Ethers.js, Canvas-confetti, Howler / Audio Effects
- **Backend**: Node.js, Express, Socket.io, Ethers.js
- **Database**: PostgreSQL
- **DevOps**: Docker & Docker Compose

---

## 🚀 วิธีติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 ขึ้นไป)
- [Docker & Docker Compose](https://www.docker.com/) (สำหรับรัน PostgreSQL)
- [Git](https://git-scm.com/)

### 2. เริ่มต้นฐานข้อมูล (Database Setup)
รัน PostgreSQL ผ่าน Docker Compose:
```bash
docker-compose up -d
```

### 3. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ในโฟลเดอร์ `server` ไปเป็น `.env`:
```bash
cp server/.env.example server/.env
```
กำหนดค่าที่จำเป็น เช่น `DB_PASSWORD`, `JWT_SECRET`, และ Web3 Keys ให้เรียบร้อย

### 4. ติดตั้ง Dependencies
ติดตั้ง dependencies ทั้งในส่วน Root, Client และ Server:
```bash
npm install
npm --prefix client install
npm --prefix server install
```

### 5. เริ่มต้นเซิร์ฟเวอร์ (Development Mode)
รันทั้ง Client และ Server พร้อมกัน:
```bash
npm run dev:server
npm run dev:client
```
- Frontend จะรันอยู่ที่: `http://localhost:5173`
- Backend API จะรันอยู่ที่: `http://localhost:5000`

---

## 🪙 ข้อมูล Smart Contract (FUKU Token)
- **Network**: BNB Smart Chain Testnet
- **Token Symbol**: FUKU
- **Contract Address**: `0xEA295B3a4b4049461515EF523809126Ea4cbB6B6`
- **Chain ID**: `97`

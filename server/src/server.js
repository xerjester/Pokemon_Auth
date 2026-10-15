const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const inventoryRoutes = require('./routes/inventory');
const skillRoutes = require('./routes/skills');
const battleRoutes = require('./routes/battle');
const web3Routes = require('./routes/web3');
const pvpRoutes = require('./routes/pvp');
const itemRoutes = require('./routes/items');
const pokemonRoutes = require('./routes/pokemons');
const farmingRoutes = require('./routes/farming');
const { startBotSimulation } = require('./services/botSimulation');
const { startFlashAuctionWorker } = require('./services/flashAuction');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/pvp', pvpRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/pokemons', pokemonRoutes);
app.use('/api/web3', web3Routes);
app.use('/api/farming', farmingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Pokemon Auction & Battle System',
    timestamp: new Date().toISOString(),
    contract: process.env.FUKU_CONTRACT_ADDRESS || '0xEA295B3a4b4049461515EF523809126Ea4cbB6B6'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Pokemon Auction & Battle API Server`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🪙 Smart Contract: ${process.env.FUKU_CONTRACT_ADDRESS || '0xEA295B3a4b4049461515EF523809126Ea4cbB6B6'}`);
  console.log(`=========================================`);
  startBotSimulation();
  startFlashAuctionWorker();
});

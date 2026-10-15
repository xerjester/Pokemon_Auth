-- PostgreSQL Schema for Pokemon Auction & Battle Platform

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) DEFAULT NULL,
    fuku_balance NUMERIC(20, 2) DEFAULT 10000.00,
    faucet_claimed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pokemons (
    id SERIAL PRIMARY KEY,
    pokeapi_id INT UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    types JSONB NOT NULL,
    base_stats JSONB NOT NULL,
    sprite_url TEXT NOT NULL,
    artwork_url TEXT NOT NULL,
    rarity VARCHAR(20) DEFAULT 'Common',
    base_price NUMERIC(10, 2) DEFAULT 500.00,
    moves JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS user_pokemons (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    pokemon_id INT REFERENCES pokemons(id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    level INT DEFAULT 50,
    current_hp INT NOT NULL,
    max_hp INT NOT NULL,
    stats JSONB NOT NULL,
    moves JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_in_team BOOLEAN DEFAULT FALSE,
    team_position INT DEFAULT NULL,
    is_for_sale BOOLEAN DEFAULT FALSE,
    acquired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auctions (
    id SERIAL PRIMARY KEY,
    user_pokemon_id INT REFERENCES user_pokemons(id) ON DELETE CASCADE,
    seller_id INT REFERENCES users(id) ON DELETE CASCADE,
    start_bid NUMERIC(20, 2) NOT NULL,
    current_bid NUMERIC(20, 2) NOT NULL,
    highest_bidder_id INT REFERENCES users(id) ON DELETE SET NULL,
    buyout_price NUMERIC(20, 2) DEFAULT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    auction_id INT REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(20, 2) NOT NULL,
    tx_hash VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS battle_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    gym_leader VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL, -- 'VICTORY', 'DEFEAT'
    reward_fuku NUMERIC(20, 2) DEFAULT 0,
    battle_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_user_pokemons_user_id ON user_pokemons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pokemons_team ON user_pokemons(user_id, is_in_team);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);

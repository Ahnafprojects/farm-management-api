import { db } from './connection.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    area_hectare REAL,
    crop_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_farms_name ON farms(name);
  CREATE INDEX IF NOT EXISTS idx_farms_location ON farms(location);
  CREATE INDEX IF NOT EXISTS idx_farms_crop_type ON farms(crop_type);
`);

export default db;

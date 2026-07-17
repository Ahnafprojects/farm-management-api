import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import './schema.js';
import { logger } from '../utils/logger.js';

/**
 * Realistic Indonesian farmland seed records.
 */
const farms = [
  {
    name: 'Sawah Makmur Jaya',
    location: 'Malang, Jawa Timur',
    area_hectare: 12.5,
    crop_type: 'padi',
  },
  {
    name: 'Kebun Jagung Sido Makmur',
    location: 'Kediri, Jawa Timur',
    area_hectare: 8.2,
    crop_type: 'jagung',
  },
  {
    name: 'Perkebunan Tebu Sumber Rejeki',
    location: 'Malang, Jawa Timur',
    area_hectare: 25.0,
    crop_type: 'tebu',
  },
  {
    name: 'Lahan Hortikultura Batu Asri',
    location: 'Batu, Jawa Timur',
    area_hectare: 5.4,
    crop_type: 'hortikultura',
  },
  {
    name: 'Sawah Tani Subur',
    location: 'Karawang, Jawa Barat',
    area_hectare: 18.75,
    crop_type: 'padi',
  },
  {
    name: 'Kebun Jagung Makmur Abadi',
    location: 'Lampung Tengah, Lampung',
    area_hectare: 14.3,
    crop_type: 'jagung',
  },
  {
    name: 'Perkebunan Tebu Gula Manis',
    location: 'Kediri, Jawa Timur',
    area_hectare: 30.6,
    crop_type: 'tebu',
  },
  {
    name: 'Sawah Padi Sejahtera',
    location: 'Indramayu, Jawa Barat',
    area_hectare: 22.1,
    crop_type: 'padi',
  },
  {
    name: 'Lahan Hortikultura Lembang',
    location: 'Lembang, Jawa Barat',
    area_hectare: 4.8,
    crop_type: 'hortikultura',
  },
  {
    name: 'Kebun Jagung Ceria',
    location: 'Gorontalo, Gorontalo',
    area_hectare: 9.9,
    crop_type: 'jagung',
  },
  {
    name: 'Sawah Tani Makmur Sentosa',
    location: 'Sragen, Jawa Tengah',
    area_hectare: 16.2,
    crop_type: 'padi',
  },
  {
    name: 'Perkebunan Tebu Sejahtera',
    location: 'Pati, Jawa Tengah',
    area_hectare: 27.4,
    crop_type: 'tebu',
  },
  {
    name: 'Lahan Hortikultura Berastagi',
    location: 'Berastagi, Sumatera Utara',
    area_hectare: 6.7,
    crop_type: 'hortikultura',
  },
  {
    name: 'Sawah Padi Lestari',
    location: 'Cianjur, Jawa Barat',
    area_hectare: 20.0,
    crop_type: 'padi',
  },
];

const demoUser = {
  email: 'demo@farmapi.dev',
  password: 'Password123!',
};

function seedFarms() {
  const insert = db.prepare(`
    INSERT INTO farms (name, location, area_hectare, crop_type, created_at, updated_at)
    VALUES (@name, @location, @area_hectare, @crop_type, @created_at, @updated_at)
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  const now = new Date().toISOString();
  const rows = farms.map((farm) => ({ ...farm, created_at: now, updated_at: now }));
  insertMany(rows);

  return rows.length;
}

function seedUser() {
  const passwordHash = bcrypt.hashSync(demoUser.password, 10);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (email, password_hash, created_at)
    VALUES (?, ?, ?)
  `);
  insert.run(demoUser.email, passwordHash, new Date().toISOString());
}

function run() {
  db.exec('DELETE FROM farms');
  db.exec('DELETE FROM users');

  const farmCount = seedFarms();
  seedUser();

  logger.info(
    `Seeded ${farmCount} farms and 1 demo user (${demoUser.email} / ${demoUser.password}).`,
  );
}

run();

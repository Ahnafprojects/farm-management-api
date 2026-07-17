# Farm Management API

REST API untuk mengelola data lahan pertanian — dibangun dengan Node.js, Express, dan SQLite.

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![CI](https://img.shields.io/badge/CI-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/tests-72%20passing-brightgreen)

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Instalasi dan Setup Lengkap](#instalasi-dan-setup-lengkap)
- [Environment Variables](#environment-variables)
- [Autentikasi](#autentikasi)
- [Referensi API](#referensi-api)
- [Penanganan Error](#penanganan-error)
- [Testing](#testing)
- [Docker](#docker)
- [Dokumentasi API](#dokumentasi-api)
- [Troubleshooting](#troubleshooting)
- [Keputusan Desain](#keputusan-desain)
- [Status Proyek dan Rencana Pengembangan](#status-proyek-dan-rencana-pengembangan)
- [Author](#author)

## Gambaran Umum

Farm Management API memungkinkan klien untuk melihat daftar, mencari, memfilter, dan
melakukan paginasi data lahan pertanian, mengambil satu data spesifik, serta
membuat/mengubah/menghapus data di balik autentikasi JWT. Proyek ini dirancang
selayaknya service production: arsitektur berlapis, SQL terparameterisasi,
validasi input yang ketat, format response JSON yang konsisten, rate limiting,
penanganan error terpusat, automated test, kemasan Docker, dan dokumentasi OpenAPI.

## Fitur

**Wajib**

- [x] `GET /farms` — daftar data dengan paginasi
- [x] `GET /farms/:id` — ambil satu data
- [x] `POST /farms` — buat data baru (dilindungi JWT)
- [x] `PUT /farms/:id` — update data (dilindungi JWT)
- [x] `DELETE /farms/:id` — hapus data (dilindungi JWT)
- [x] Pencarian (`search` berdasarkan nama) dan filter (`location`, `crop_type`)
- [x] Autentikasi JWT (`/auth/register`, `/auth/login`)
- [x] Setup Docker (multi-stage build + docker-compose)
- [x] Unit/integration test (Jest + Supertest)
- [x] Dokumentasi OpenAPI (Swagger UI di `/docs`)
- [x] README yang lengkap

**Bonus**

- [x] Pengurutan (`sort`, `order`)
- [x] Rate limiting (umum + lebih ketat khusus `/auth/*`)
- [x] Seed script dengan data lahan pertanian Indonesia yang realistis + demo user
- [x] Postman collection
- [x] CI GitHub Actions (lint + test setiap push/PR)
- [x] ESLint + Prettier tanpa warning
- [x] Format response sukses/error yang konsisten di semua endpoint, termasuk 404 dan 429

## Tech Stack

| Layer       | Pilihan                                      | Alasan                                                                                                                                                    |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime     | Node.js 20 LTS                               | LTS yang stabil, native ESM, native `fetch` (dipakai untuk Docker healthcheck)                                                                            |
| Framework   | Express 4                                    | Minimal, matang, standar de-facto untuk skala API seperti ini                                                                                             |
| Database    | SQLite via `better-sqlite3`                  | Tanpa konfigurasi, synchronous (tidak ada race condition tak terduga), berbasis file — cocok untuk skala ini. Lihat [Keputusan Desain](#keputusan-desain) |
| Validasi    | Zod                                          | Schema yang ketat dan mudah dikomposisi; menolak field tak dikenal; melakukan coercion query string dengan aman                                           |
| Auth        | `jsonwebtoken` + `bcryptjs`                  | Standar industri untuk JWT stateless; bcrypt untuk hashing password satu arah                                                                             |
| Security    | `helmet`, `cors`, `express-rate-limit`       | Header HTTP yang aman, whitelist origin, mitigasi brute-force                                                                                             |
| Logging     | `morgan`                                     | Logging HTTP request standar, format dev vs combined tergantung environment                                                                               |
| Testing     | Jest + Supertest                             | Cepat, terdokumentasi dengan baik, dukungan assertion HTTP kelas satu                                                                                     |
| Docs        | `swagger-ui-express` + `openapi.yaml` manual | Dokumentasi interaktif yang selalu sinkron dengan kode                                                                                                    |
| Lint/Format | ESLint + Prettier                            | Gaya kode konsisten, menangkap bug lebih awal                                                                                                             |
| Container   | Docker (multi-stage) + Compose               | Build yang dapat direproduksi, image runtime kecil, volume persisten untuk file DB                                                                        |
| CI          | GitHub Actions                               | Gate otomatis lint + format check + test di setiap push/PR                                                                                                |

## Arsitektur

Arsitektur berlapis — setiap layer punya satu tanggung jawab, dan dependency hanya mengalir ke bawah:

```
src/
├── app.js                 # Express app (di-export, tanpa .listen — dipakai langsung di test)
├── server.js               # bootstrap + graceful shutdown (SIGINT/SIGTERM)
├── config/index.js         # loading env + validasi Zod, fail-fast saat boot
├── db/
│   ├── connection.js       # instance better-sqlite3 (mode WAL)
│   ├── schema.js            # CREATE TABLE IF NOT EXISTS
│   └── seed.js              # npm run seed
├── routes/                 # pemetaan HTTP method + path -> controller
├── controllers/            # tipis: parse req -> panggil service -> kirim response
├── services/                # business logic, melempar ApiError
├── repositories/            # semua SQL, hanya prepared statements
├── middlewares/             # auth, validate, errorHandler, notFound, rateLimiter
├── schemas/                 # schema Zod
└── utils/                   # ApiError, asyncHandler, response helpers
```

Alur request:

```
Client
  │
  ▼
helmet / cors / morgan / express.json / rate limiter   (middleware chain di app.js)
  │
  ▼
Router                (routes/*.routes.js)
  │
  ▼
validate(schema)       (middlewares/validate.js — Zod)
  │
  ▼
requireAuth (jika dilindungi)   (middlewares/auth.js — JWT)
  │
  ▼
Controller             (controllers/*.controller.js — tipis, tanpa business logic)
  │
  ▼
Service                (services/*.service.js — aturan bisnis, melempar ApiError)
  │
  ▼
Repository             (repositories/*.repository.js — prepared SQL statements)
  │
  ▼
SQLite (better-sqlite3)
  │
  ▼
Response dikirim balik lewat controller, atau
middleware errorHandler kalau ada yang error
```

## Instalasi dan Setup Lengkap

Bagian ini ditulis selengkap mungkin, mulai dari nol, supaya siapa pun yang belum
pernah menyentuh Node.js sekalipun bisa mengikuti dan menjalankan proyek ini
sampai selesai.

### Langkah 0 — Cek prasyarat di komputer kamu

Proyek ini butuh:

- **Node.js versi 20 atau lebih baru** (termasuk `npm`, yang selalu ikut terpasang bersama Node.js)
- **Git** (untuk clone repository)
- **Docker** dan **Docker Compose** — opsional, hanya kalau kamu mau menjalankan lewat container
- **curl** atau **Postman** — opsional, untuk mencoba endpoint secara manual

Cek dulu apakah semuanya sudah terpasang dengan menjalankan perintah berikut satu per satu di terminal:

```bash
node -v
npm -v
git --version
docker --version
```

Kalau semua perintah di atas mengeluarkan nomor versi (bukan pesan "command not found"),
kamu bisa langsung lompat ke [Langkah 2](#langkah-2--clone-repository).

Contoh output yang benar:

```
v20.19.0
10.8.2
git version 2.43.0
Docker version 27.3.1, build ce12230
```

Kalau `node -v` menunjukkan versi di bawah 20 (misalnya v16 atau v18), atau kalau
perintahnya tidak dikenali sama sekali, lanjut ke Langkah 1 untuk install/upgrade Node.js.

### Langkah 1 — Install Node.js (kalau belum ada atau versinya kurang dari 20)

Pilih salah satu cara sesuai sistem operasi kamu.

**Opsi A — Pakai nvm (disarankan, mudah untuk ganti-ganti versi Node.js di kemudian hari)**

Untuk macOS / Linux:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# tutup dan buka lagi terminal, atau jalankan:
source ~/.bashrc   # atau ~/.zshrc kalau pakai zsh

nvm install 20
nvm use 20
```

Untuk Windows, pakai [nvm-windows](https://github.com/coreybutler/nvm-windows/releases):
download installer `.exe` dari halaman rilis tersebut, jalankan, lalu buka
Command Prompt/PowerShell baru dan jalankan:

```
nvm install 20.19.0
nvm use 20.19.0
```

**Opsi B — Download installer resmi langsung**

Buka [nodejs.org](https://nodejs.org/), download versi **LTS** (saat ini minimal versi 20),
lalu jalankan installer-nya dan ikuti langkah-langkahnya sampai selesai.

**Verifikasi setelah instalasi:**

```bash
node -v
npm -v
```

Pastikan `node -v` menunjukkan `v20.x.x` atau lebih tinggi sebelum lanjut.

### Langkah 2 — Clone repository

```bash
git clone https://github.com/Ahnafprojects/farm-management-api.git
cd farm-management-api
```

Kalau kamu clone dari fork sendiri, ganti URL di atas dengan URL fork kamu.

Setelah `cd`, cek isi foldernya untuk memastikan clone berhasil:

```bash
ls
```

Harus muncul file/folder seperti `package.json`, `src/`, `tests/`, `docs/`, `README.md`, dan lain-lain.

### Langkah 3 — Install semua dependency

```bash
npm install
```

Proses ini akan mengunduh semua package yang dibutuhkan (Express, Zod, better-sqlite3,
Jest, dan lain-lain) ke dalam folder `node_modules/`. Prosesnya biasanya memakan waktu
sekitar 10-40 detik tergantung koneksi internet.

Salah satu dependency, `better-sqlite3`, memerlukan proses build native (compile ke
binary sesuai sistem operasi kamu). Kalau proses ini gagal, biasanya karena build tools
belum terpasang — lihat bagian [Troubleshooting](#troubleshooting) untuk solusinya.

Output yang menandakan sukses akan terlihat seperti ini di baris terakhir:

```
added 585 packages, and audited 586 packages in 20s
found 0 vulnerabilities
```

### Langkah 4 — Konfigurasi environment variables

Salin file contoh environment menjadi file `.env` yang sungguhan:

```bash
cp .env.example .env
```

Lalu buka file `.env` dengan text editor apa pun (VS Code, nano, vim, dsb.) dan isi
minimal variabel `JWT_SECRET` dengan string acak yang panjang. Untuk kebutuhan lokal,
kamu bisa generate string acak dengan perintah:

```bash
openssl rand -hex 32
```

Salin hasilnya, lalu tempel sebagai nilai `JWT_SECRET` di file `.env`, contoh:

```
JWT_SECRET=8f3a9c1e7b2d4f6a9c0e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a
```

Variabel lain di `.env.example` sudah punya nilai default yang masuk akal untuk
development lokal dan tidak wajib diubah. Penjelasan lengkap tiap variabel ada di
bagian [Environment Variables](#environment-variables).

### Langkah 5 — Isi database dengan data contoh (seed)

```bash
npm run seed
```

Perintah ini akan membuat file database SQLite di `data/farms.db` (folder `data/`
dibuat otomatis kalau belum ada), lalu mengisinya dengan 14 data lahan pertanian
contoh dan 1 akun demo untuk testing.

Output yang benar:

```
Seeded 14 farms and 1 demo user (demo@farmapi.dev / Password123!).
```

Kalau kamu menjalankan `npm run seed` lagi di kemudian hari, data lama akan dihapus
dan diisi ulang dari awal (aman untuk dijalankan berkali-kali).

### Langkah 6 — Jalankan server

Untuk development (server otomatis restart setiap ada perubahan file):

```bash
npm run dev
```

Atau untuk mode seperti production (tanpa auto-restart):

```bash
npm start
```

Kalau berhasil, akan muncul log seperti ini di terminal:

```
Farm Management API listening on port 3000 (development)
```

Biarkan terminal ini tetap terbuka dan berjalan — ini adalah proses server kamu.
Buka terminal/tab baru untuk melanjutkan ke langkah berikutnya.

### Langkah 7 — Verifikasi server benar-benar berjalan

Di terminal baru, jalankan:

```bash
curl http://localhost:3000/health
```

Response yang benar:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "status": "ok", "uptime": 5, "timestamp": "2026-07-17T12:00:00.000Z" }
}
```

Kalau muncul response seperti di atas, artinya server sudah berjalan dengan benar.

Kamu juga bisa membuka dokumentasi interaktif (Swagger UI) langsung di browser:

```
http://localhost:3000/docs
```

### Langkah 8 — Coba endpoint secara manual (opsional, tapi disarankan)

Ambil daftar farm yang sudah di-seed:

```bash
curl http://localhost:3000/farms
```

Login dengan akun demo untuk mendapatkan token JWT:

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farmapi.dev","password":"Password123!"}'
```

Salin nilai `data.token` dari response di atas, lalu simpan ke variabel supaya
gampang dipakai ulang:

```bash
TOKEN="tempel-token-di-sini"
```

Coba buat data farm baru menggunakan token tersebut:

```bash
curl -s -X POST http://localhost:3000/farms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sawah Percobaan","location":"Bogor, Jawa Barat","area_hectare":3.5,"crop_type":"padi"}'
```

Kalau berhasil, kamu akan mendapat response `201 Created` berisi data farm yang baru dibuat.

### Langkah 9 — Jalankan test suite (opsional, tapi disarankan untuk memastikan semuanya benar)

```bash
npm test
```

Semua 72 test seharusnya lolos (`Tests: 72 passed, 72 total`). Test ini berjalan
di database terpisah (in-memory), jadi tidak akan mengubah data yang sudah kamu
seed di Langkah 5.

Sampai di sini, instalasi dan setup sudah selesai sepenuhnya. Untuk menjalankan
lewat Docker sebagai alternatif, lihat bagian [Docker](#docker). Kalau ada error
di salah satu langkah di atas, cek bagian [Troubleshooting](#troubleshooting).

## Environment Variables

Semua konfigurasi dibaca dari environment variables dan divalidasi dengan Zod saat
boot (`src/config/index.js`) — proses langsung berhenti dengan pesan yang jelas
kalau ada variabel wajib yang hilang atau tidak valid. Lihat `.env.example` untuk
daftar lengkap dan otoritatif.

| Nama                        | Wajib? | Default           | Deskripsi                                                                                   |
| --------------------------- | ------ | ----------------- | ------------------------------------------------------------------------------------------- |
| `PORT`                      | Tidak  | `3000`            | Port tempat HTTP server berjalan                                                            |
| `NODE_ENV`                  | Tidak  | `development`     | `development` \| `test` \| `production`                                                     |
| `DB_PATH`                   | Tidak  | `./data/farms.db` | Path ke file SQLite, atau `:memory:` untuk penyimpanan sementara                            |
| `JWT_SECRET`                | Ya     | —                 | Secret untuk sign/verify JWT. Boot gagal kalau tidak ada; di production minimal 16 karakter |
| `JWT_EXPIRES_IN`            | Tidak  | `1h`              | Masa berlaku token, misal `1h`, `7d`                                                        |
| `CORS_ORIGIN`               | Tidak  | `*`               | Daftar origin yang diizinkan (pisahkan koma). `*` ditolak di production                     |
| `RATE_LIMIT_WINDOW_MS`      | Tidak  | `900000`          | Jendela waktu rate limit umum (ms)                                                          |
| `RATE_LIMIT_MAX`            | Tidak  | `100`             | Maksimal request per jendela waktu per IP (semua route)                                     |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Tidak  | `900000`          | Jendela waktu rate limit (ms) khusus `/auth/*`                                              |
| `AUTH_RATE_LIMIT_MAX`       | Tidak  | `10`              | Maksimal request per jendela waktu per IP khusus `/auth/*`                                  |

## Autentikasi

1. `POST /auth/register` dengan `{ email, password }` (password minimal 8 karakter) membuat user baru.
2. `POST /auth/login` dengan kredensial yang sama mengembalikan JWT beserta masa berlakunya.
3. Kirim token pada request yang dilindungi lewat header `Authorization: Bearer <token>`.
4. Token ditandatangani dengan HS256 dan kedaluwarsa setelah `JWT_EXPIRES_IN` (default `1h`).
5. Token yang hilang, salah format, atau kedaluwarsa semuanya menghasilkan response `401 UNAUTHORIZED` yang identik, dan kegagalan login tidak pernah membocorkan apakah email atau password yang salah.

**Kredensial demo** (dibuat oleh `npm run seed`):

```
email:    demo@farmapi.dev
password: Password123!
```

Contoh cepat:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farmapi.dev","password":"Password123!"}' | jq -r .data.token)

curl -s http://localhost:3000/farms \
  -H "Authorization: Bearer $TOKEN"
```

Kalau kamu tidak punya `jq` terpasang, ambil token secara manual dari response JSON
dan tempel langsung ke variabel `TOKEN`.

## Referensi API

Base URL: `http://localhost:3000` (tanpa prefix versi — lihat [Keputusan Desain](#keputusan-desain)).

### GET /health

Butuh auth: Tidak

curl:

```bash
curl -s http://localhost:3000/health
```

Sukses `200`:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "status": "ok", "uptime": 42, "timestamp": "2026-07-17T12:00:00.000Z" }
}
```

### POST /auth/register

Butuh auth: Tidak

| Field      | Tipe   | Aturan                          |
| ---------- | ------ | ------------------------------- |
| `email`    | string | harus email valid, wajib diisi  |
| `password` | string | minimal 8 karakter, wajib diisi |

curl:

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@example.com","password":"SecurePass123"}'
```

Sukses `201`:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { "id": 2, "email": "farmer@example.com" }
}
```

Error `409` (email sudah terdaftar):

```json
{
  "success": false,
  "error": { "code": "CONFLICT", "message": "An account with this email already exists" }
}
```

### POST /auth/login

Butuh auth: Tidak

| Field      | Tipe   | Aturan                   |
| ---------- | ------ | ------------------------ |
| `email`    | string | harus email valid, wajib |
| `password` | string | wajib diisi              |

curl:

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farmapi.dev","password":"Password123!"}'
```

Sukses `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "expiresIn": "1h" }
}
```

Error `401` (email atau password salah — pesan sama untuk keduanya):

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" }
}
```

### GET /farms

Butuh auth: Tidak

Query params:

| Param       | Tipe    | Aturan                                                             |
| ----------- | ------- | ------------------------------------------------------------------ |
| `page`      | integer | lebih besar sama dengan 1, default `1`                             |
| `limit`     | integer | 1 sampai 100, default `10`                                         |
| `location`  | string  | pencocokan sebagian, tidak case-sensitive                          |
| `crop_type` | string  | pencocokan sebagian, tidak case-sensitive                          |
| `search`    | string  | pencocokan sebagian pada `name`, tidak case-sensitive              |
| `sort`      | enum    | `name` atau `area_hectare` atau `created_at`, default `created_at` |
| `order`     | enum    | `asc` atau `desc`, default `desc`                                  |

Filter digabung dengan AND.

curl:

```bash
curl -s "http://localhost:3000/farms?page=1&limit=5&crop_type=padi&sort=area_hectare&order=asc"
```

Sukses `200`:

```json
{
  "success": true,
  "message": "Farms retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Sawah Makmur Jaya",
      "location": "Malang, Jawa Timur",
      "area_hectare": 12.5,
      "crop_type": "padi",
      "created_at": "2026-07-17T12:00:00.000Z",
      "updated_at": "2026-07-17T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 5, "totalItems": 14, "totalPages": 3 }
}
```

Error `400` (query tidak valid, misal `limit=500`):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [{ "field": "limit", "message": "limit must be <= 100" }]
  }
}
```

**Objek meta paginasi**: `page` (halaman saat ini), `limit` (jumlah per halaman), `totalItems`
(total baris yang cocok), `totalPages` (`ceil(totalItems / limit)`).

### GET /farms/:id

Butuh auth: Tidak

| Param | Tipe           | Aturan                                   |
| ----- | -------------- | ---------------------------------------- |
| `id`  | integer (path) | harus integer positif, kalau tidak `400` |

curl:

```bash
curl -s http://localhost:3000/farms/1
```

Sukses `200`:

```json
{
  "success": true,
  "message": "Farm retrieved successfully",
  "data": {
    "id": 1,
    "name": "Sawah Makmur Jaya",
    "location": "Malang, Jawa Timur",
    "area_hectare": 12.5,
    "crop_type": "padi",
    "created_at": "2026-07-17T12:00:00.000Z",
    "updated_at": "2026-07-17T12:00:00.000Z"
  }
}
```

Error `404`:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Farm with id 999 not found" }
}
```

### POST /farms

Butuh auth: Ya (`Authorization: Bearer <token>`)

Body (field tak dikenal ditolak):

| Field          | Tipe   | Aturan                       |
| -------------- | ------ | ---------------------------- |
| `name`         | string | wajib, 1 sampai 100 karakter |
| `location`     | string | opsional, maks 150 karakter  |
| `area_hectare` | number | opsional, harus positif      |
| `crop_type`    | string | opsional, maks 50 karakter   |

curl:

```bash
curl -s -i -X POST http://localhost:3000/farms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sawah Makmur Jaya","location":"Malang, Jawa Timur","area_hectare":12.5,"crop_type":"padi"}'
```

Sukses `201` (juga mengembalikan header `Location: /farms/<id>`):

```json
{
  "success": true,
  "message": "Farm created successfully",
  "data": {
    "id": 15,
    "name": "Sawah Makmur Jaya",
    "location": "Malang, Jawa Timur",
    "area_hectare": 12.5,
    "crop_type": "padi",
    "created_at": "2026-07-17T12:00:00.000Z",
    "updated_at": "2026-07-17T12:00:00.000Z"
  }
}
```

Error `400` (contoh: `name` tidak diisi):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [{ "field": "name", "message": "Name is required" }]
  }
}
```

Error `401` (token hilang/tidak valid):

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid Authorization header" }
}
```

### PUT /farms/:id

Butuh auth: Ya. Semantik full-update — validasi sama seperti `POST` (`name` wajib); `updated_at` diperbarui.

curl:

```bash
curl -s -X PUT http://localhost:3000/farms/15 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sawah Makmur Jaya Updated","location":"Malang, Jawa Timur","area_hectare":15,"crop_type":"jagung"}'
```

Sukses `200`:

```json
{
  "success": true,
  "message": "Farm updated successfully",
  "data": {
    "id": 15,
    "name": "Sawah Makmur Jaya Updated",
    "location": "Malang, Jawa Timur",
    "area_hectare": 15,
    "crop_type": "jagung",
    "created_at": "2026-07-17T12:00:00.000Z",
    "updated_at": "2026-07-17T12:05:00.000Z"
  }
}
```

Error `404`:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Farm with id 999 not found" }
}
```

### DELETE /farms/:id

Butuh auth: Ya

curl:

```bash
curl -s -i -X DELETE http://localhost:3000/farms/15 \
  -H "Authorization: Bearer $TOKEN"
```

Sukses: `204 No Content` (tanpa body).

Error `404`:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Farm with id 999 not found" }
}
```

### Kode error

| Kode               | Status HTTP | Arti                                                        |
| ------------------ | ----------- | ----------------------------------------------------------- |
| `VALIDATION_ERROR` | 400         | Body/query/params request gagal validasi                    |
| `UNAUTHORIZED`     | 401         | Token hilang/tidak valid/kedaluwarsa, atau kredensial salah |
| `NOT_FOUND`        | 404         | Resource atau route tidak ditemukan                         |
| `CONFLICT`         | 409         | Resource sudah ada (email duplikat)                         |
| `RATE_LIMITED`     | 429         | Terlalu banyak request dalam jendela waktu berjalan         |
| `INTERNAL_ERROR`   | 500         | Error server yang tidak terduga                             |

## Penanganan Error

Setiap response — sukses maupun gagal — memakai format yang sama.

Sukses:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
```

(`meta` hanya muncul di endpoint list dengan paginasi.)

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [{ "field": "name", "message": "Name is required" }]
  }
}
```

Ini termasuk route yang tidak dikenal (`404 NOT_FOUND` lewat middleware `notFound`),
penolakan karena rate limit (`429 RATE_LIMITED`), dan body JSON yang salah format
(`400 VALIDATION_ERROR`). Di production, error tak terduga (`500`) tidak pernah
membocorkan stack trace atau pesan internal ke klien — error tersebut dicatat di
sisi server dan pesan generik dikembalikan ke klien.

## Testing

```bash
npm test              # jalankan seluruh test suite Jest + Supertest
npm run test:coverage # sama, dengan laporan coverage
```

Test dijalankan terhadap database SQLite in-memory yang terisolasi (`DB_PATH=:memory:`,
diatur di `tests/env.setup.js`) — tidak pernah menyentuh file database development.

Cakupan test meliputi:

- `GET /health`
- Auth: register sukses/duplikat/body tidak valid, login sukses/password salah (pesan identik, waktu respons konstan)
- Farms happy path: create (dengan header `Location`), list (dengan `meta`), get by id, update, delete
- Farms error path: token hilang/tidak valid/kedaluwarsa/palsu/`alg:none`, `name` hilang/kosong/spasi/terlalu panjang, `area_hectare` tidak valid, field tak dikenal, mass-assignment field sistem, id non-integer/negatif/nol/desimal, 404 pada GET/PUT/DELETE
- Ketepatan meta paginasi, validasi batas `limit`/`page`, dan filter tanpa hasil yang tetap mengembalikan `200` dengan array kosong
- Filter berdasarkan `location`, `crop_type`, `search`, kombinasi filter dengan AND, serta `sort`/`order` (termasuk verifikasi urutan aktual dan penolakan nilai tidak valid)
- Lintas fitur: response untuk route tak dikenal dan method tak didukung, JSON salah format, body terlalu besar, kedua rate limiter mengembalikan envelope `RATE_LIMITED`, dan validasi fail-fast konfigurasi saat boot

## Docker

Pastikan Docker dan Docker Compose sudah terpasang dan Docker daemon sedang berjalan
(cek dengan `docker info`, kalau muncul error berarti Docker Desktop/daemon belum dijalankan).

**Cara paling mudah — pakai Docker Compose:**

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

Perintah ini akan build image, membuat container, dan menjalankannya sekaligus.
Tunggu sampai muncul log `Farm Management API listening on port 3000`, lalu di
terminal lain jalankan:

```bash
curl http://localhost:3000/health
```

Untuk menghentikan container:

```bash
docker compose down
```

Tambahkan flag `-v` (`docker compose down -v`) kalau kamu juga ingin menghapus
volume data (`farm-data`) sekaligus, misalnya untuk mulai dari database yang benar-benar bersih.

**Cara alternatif — build dan jalankan image secara manual:**

```bash
docker build -t farm-management-api .
docker run -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e CORS_ORIGIN=http://localhost:3000 \
  farm-management-api
```

Container berjalan sebagai non-root user, membuka port `3000`, menyimpan file
SQLite di named volume (`farm-data`) agar data tetap ada setelah restart, dan
memiliki `HEALTHCHECK` yang mengecek `GET /health` setiap 30 detik.

## Dokumentasi API

- Swagger UI interaktif: [`GET /docs`](http://localhost:3000/docs), dihasilkan dari `docs/openapi.yaml` (OpenAPI 3.0).
- Postman collection: [`docs/postman_collection.json`](docs/postman_collection.json) — import ke Postman, atur variabel collection `token` setelah memanggil Login (otomatis diisi lewat test script), lalu coba semua endpoint.

## Troubleshooting

**`npm install` gagal saat build `better-sqlite3`**

Package ini butuh compiler native (Python, make, g++/gcc). Di Linux, install dulu:

```bash
sudo apt-get install -y python3 make g++
```

Di macOS, pastikan Xcode Command Line Tools terpasang:

```bash
xcode-select --install
```

Di Windows, disarankan pakai WSL (Windows Subsystem for Linux), atau install
`windows-build-tools` sesuai dokumentasi `node-gyp`.

**Error `Error: listen EADDRINUSE: address already in use :::3000`**

Artinya port 3000 sudah dipakai proses lain. Cara mengatasi:

```bash
# cari proses yang memakai port 3000
lsof -i :3000

# matikan prosesnya (ganti <PID> dengan angka dari output di atas)
kill <PID>
```

Atau jalankan API di port lain dengan mengubah `PORT` di file `.env`.

**Boot gagal dengan pesan terkait `JWT_SECRET`**

Berarti file `.env` belum dibuat atau `JWT_SECRET` masih kosong. Ulangi
[Langkah 4](#langkah-4--konfigurasi-environment-variables) di atas.

**`npm run seed` sukses tapi `GET /farms` mengembalikan data kosong**

Kemungkinan server dan seed script menunjuk ke file database yang berbeda.
Pastikan `DB_PATH` di `.env` sama antara saat menjalankan `npm run seed` dan
`npm run dev`/`npm start` (keduanya membaca file `.env` yang sama secara default).

**Docker: `docker info` menampilkan error**

Docker daemon belum berjalan. Buka aplikasi Docker Desktop (macOS/Windows) atau
jalankan `sudo systemctl start docker` (Linux), lalu coba lagi.

## Keputusan Desain

- **SQLite / better-sqlite3**: untuk API CRUD satu-service dengan skala seperti
  ini, database berbasis file yang synchronous dan tanpa konfigurasi
  menghilangkan banyak masalah operasional (connection pool, latensi jaringan,
  race condition asinkron) sambil tetap menegakkan constraint SQL asli dan
  memakai prepared statement sungguhan. API synchronous dari `better-sqlite3`
  juga menyederhanakan layer service/repository (tidak ada `await` bertebaran
  di query sederhana) dan membuat test cepat serta terisolasi penuh lewat
  database `:memory:`.
- **Arsitektur berlapis** (routes menuju controllers menuju services menuju repositories):
  memisahkan urusan HTTP, aturan bisnis, dan SQL masing-masing di satu tempat,
  sehingga tiap layer bisa diuji atau diganti secara independen. Controller
  tetap tipis; semua SQL terkumpul di `repositories/`, yang membuat aturan
  "tidak ada string concatenation input user ke SQL" mudah dijamin dan direview.
- **Zod**: schema sekaligus berfungsi sebagai dokumentasi, melakukan coercion
  tipe query string dengan aman (misal `page=2` menjadi angka `2`), dan menolak
  field tak dikenal (`.strict()`) sehingga typo di body request langsung gagal
  alih-alih diabaikan diam-diam.
- **Tanpa prefix `/api/v1`**: brief menetapkan path literal yang eksak
  (`/farms`, `/auth/...`, `/health`, `/docs`), jadi tidak ditambahkan prefix
  versi. Dalam rollout production sungguhan, menambahkan `/api/v1/...` (atau
  skema berbasis header `Accept`) akan jadi salah satu langkah hardening
  pertama begitu versi API kedua dibutuhkan.
- **Security**: `helmet` untuk header HTTP standar yang aman, `cors` dibatasi
  ke whitelist origin eksplisit (dengan `*` ditolak total di production),
  rate limiting umum dan khusus auth untuk memperlambat percobaan brute-force,
  batas body JSON 10kb, bcrypt (cost 10) untuk hashing password, dan validasi
  Zod yang fail-fast pada environment variable saat boot supaya kesalahan
  konfigurasi langsung ketahuan, bukan baru muncul saat ada request.

## Status Proyek dan Rencana Pengembangan

Proyek ini sudah memenuhi seluruh brief dan siap untuk direview. Daftar jujur
hal yang akan ditambahkan pada rollout production sungguhan:

- Refresh token / pencabutan token (JWT saat ini stateless dan tidak bisa dibatalkan sebelum kedaluwarsa)
- Role-based access control (RBAC) — saat ini semua user yang sudah login bisa mengubah farm milik siapa saja
- Migrasi ke PostgreSQL untuk skalabilitas multi-instance/horizontal
- Pipeline CI/CD yang juga build dan deploy image Docker
- Propagasi request-id dan logging terstruktur (JSON) untuk observability
- Versioning API (`/api/v1`) begitu ada perubahan yang breaking

## Author

**Muhammad Ahnaf**
GitHub: [github.com/Ahnafprojects](https://github.com/Ahnafprojects)

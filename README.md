# Farm Management API

A RESTful API for managing farmland (_lahan pertanian_) records — built with Node.js, Express, and SQLite.

![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)
![CI](https://img.shields.io/badge/CI-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/tests-72%20passing-brightgreen)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Docker](#docker)
- [API Docs](#api-docs)
- [Design Decisions](#design-decisions)
- [Project Status & Future Improvements](#project-status--future-improvements)
- [Author](#author)

## Overview

The Farm Management API lets a client list, search, filter, and paginate farmland
records, fetch a single record, and create/update/delete records behind JWT
authentication. It is designed as a small, production-shaped service: layered
architecture, parameterized SQL, strict input validation, a consistent JSON
response envelope, rate limiting, centralized error handling, automated tests,
Docker packaging, and OpenAPI documentation.

## Features

**Mandatory**

- ✅ `GET /farms` — list with pagination
- ✅ `GET /farms/:id` — get one
- ✅ `POST /farms` — create (JWT protected)
- ✅ `PUT /farms/:id` — update (JWT protected)
- ✅ `DELETE /farms/:id` — delete (JWT protected)
- ✅ Search (`search` on name) and filtering (`location`, `crop_type`)
- ✅ JWT authentication (`/auth/register`, `/auth/login`)
- ✅ Docker setup (multi-stage build + docker-compose)
- ✅ Unit/integration tests (Jest + Supertest)
- ✅ OpenAPI documentation (Swagger UI at `/docs`)
- ✅ Exhaustive README

**Bonus**

- ✅ Sorting (`sort`, `order`)
- ✅ Rate limiting (general + stricter on `/auth/*`)
- ✅ Seed script with realistic Indonesian farm data + demo user
- ✅ Postman collection
- ✅ GitHub Actions CI (lint + test on push/PR)
- ✅ ESLint + Prettier with zero warnings
- ✅ Consistent success/error envelope on every response, including 404 and 429

## Tech Stack

| Layer       | Choice                                             | Why                                                                                                                                    |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime     | Node.js 20 LTS                                     | Stable LTS, native ESM, native `fetch` (used by the Docker healthcheck)                                                                |
| Framework   | Express 4                                          | Minimal, mature, the de-facto standard for this scale of API                                                                           |
| Database    | SQLite via `better-sqlite3`                        | Zero-config, synchronous (no accidental race conditions), file-based — ideal for this scope. See [Design Decisions](#design-decisions) |
| Validation  | Zod                                                | Strict, composable schemas; rejects unknown fields; coerces query strings safely                                                       |
| Auth        | `jsonwebtoken` + `bcryptjs`                        | Industry-standard stateless JWT auth; bcrypt for one-way password hashing                                                              |
| Security    | `helmet`, `cors`, `express-rate-limit`             | Secure HTTP headers, origin allow-listing, brute-force mitigation                                                                      |
| Logging     | `morgan`                                           | Standard HTTP request logging, dev vs. combined format per environment                                                                 |
| Testing     | Jest + Supertest                                   | Fast, well-documented, first-class HTTP assertion support                                                                              |
| Docs        | `swagger-ui-express` + hand-written `openapi.yaml` | Interactive, always-in-sync documentation                                                                                              |
| Lint/Format | ESLint + Prettier                                  | Consistent style, catch bugs early                                                                                                     |
| Container   | Docker (multi-stage) + Compose                     | Reproducible builds, small runtime image, persistent volume for the DB file                                                            |
| CI          | GitHub Actions                                     | Automated lint + test gate on every push/PR                                                                                            |

## Architecture

Layered architecture — each layer has one job, and dependencies only point downward:

```
src/
├── app.js                 # Express app (exported, no .listen — used directly in tests)
├── server.js               # bootstrap + graceful shutdown (SIGINT/SIGTERM)
├── config/index.js         # env loading + Zod validation, fail-fast on boot
├── db/
│   ├── connection.js       # better-sqlite3 instance (WAL mode)
│   ├── schema.js            # CREATE TABLE IF NOT EXISTS
│   └── seed.js              # npm run seed
├── routes/                 # HTTP method + path -> controller wiring
├── controllers/            # thin: parse req -> call service -> send response
├── services/                # business logic, throws ApiError
├── repositories/            # all SQL, prepared statements only
├── middlewares/             # auth, validate, errorHandler, notFound, rateLimiter
├── schemas/                 # Zod schemas
└── utils/                   # ApiError, asyncHandler, response helpers
```

Request lifecycle:

```
Client
  │
  ▼
helmet / cors / morgan / express.json / rate limiter   (app.js middleware chain)
  │
  ▼
Router                (routes/*.routes.js)
  │
  ▼
validate(schema)       (middlewares/validate.js — Zod)
  │
  ▼
requireAuth (if protected)   (middlewares/auth.js — JWT)
  │
  ▼
Controller             (controllers/*.controller.js — thin, no business logic)
  │
  ▼
Service                (services/*.service.js — business rules, throws ApiError)
  │
  ▼
Repository             (repositories/*.repository.js — prepared SQL statements)
  │
  ▼
SQLite (better-sqlite3)
  │
  ▼
Response envelope sent back through controller, or
errorHandler middleware if anything threw
```

## Getting Started

Prerequisites: Node.js 20+, npm.

```bash
# 1. Clone the repository
git clone <your-fork-url> farm-management-api
cd farm-management-api

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# edit .env and set a real JWT_SECRET (any long random string works for local dev)

# 4. Seed the database (creates data/farms.db with sample farms + demo user)
npm run seed

# 5. Run in development (auto-restarts on file change)
npm run dev

# ...or run in production mode
npm start
```

The API will be available at `http://localhost:3000`, with interactive docs at
`http://localhost:3000/docs`.

## Environment Variables

All configuration is read from environment variables and validated with Zod at
boot (`src/config/index.js`) — the process exits immediately with a clear
message if a required variable is missing or invalid. See `.env.example` for
the complete, authoritative list.

| Name                        | Required? | Default           | Description                                                                                     |
| --------------------------- | --------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `PORT`                      | No        | `3000`            | Port the HTTP server listens on                                                                 |
| `NODE_ENV`                  | No        | `development`     | `development` \| `test` \| `production`                                                         |
| `DB_PATH`                   | No        | `./data/farms.db` | Path to the SQLite file, or `:memory:` for ephemeral storage                                    |
| `JWT_SECRET`                | **Yes**   | —                 | Secret used to sign/verify JWTs. Boot fails without it; in production it must be ≥16 characters |
| `JWT_EXPIRES_IN`            | No        | `1h`              | Token lifetime, e.g. `1h`, `7d`                                                                 |
| `CORS_ORIGIN`               | No        | `*`               | Comma-separated allow-list of origins. `*` is rejected in production                            |
| `RATE_LIMIT_WINDOW_MS`      | No        | `900000`          | General rate-limit window (ms)                                                                  |
| `RATE_LIMIT_MAX`            | No        | `100`             | Max requests per window per IP (all routes)                                                     |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No        | `900000`          | Rate-limit window (ms) for `/auth/*`                                                            |
| `AUTH_RATE_LIMIT_MAX`       | No        | `10`              | Max requests per window per IP for `/auth/*`                                                    |

## Authentication

1. `POST /auth/register` with `{ email, password }` (password ≥ 8 chars) creates a user.
2. `POST /auth/login` with the same credentials returns a signed JWT and its lifetime.
3. Send the token on protected requests as `Authorization: Bearer <token>`.
4. Tokens are signed with HS256 and expire after `JWT_EXPIRES_IN` (default `1h`).
5. Missing, malformed, or expired tokens all yield an identical `401 UNAUTHORIZED` response, and login failures never reveal whether the email or the password was wrong.

**Demo credentials** (created by `npm run seed`):

```
email:    demo@farmapi.dev
password: Password123!
```

Quick start:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farmapi.dev","password":"Password123!"}' | jq -r .data.token)

curl -s http://localhost:3000/farms \
  -H "Authorization: Bearer $TOKEN"
```

## API Reference

Base URL: `http://localhost:3000` (no version prefix — see [Design Decisions](#design-decisions)).

### GET /health

Auth required: No

curl:

```bash
curl -s http://localhost:3000/health
```

Success `200`:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": { "status": "ok", "uptime": 42, "timestamp": "2026-07-17T12:00:00.000Z" }
}
```

### POST /auth/register

Auth required: No

| Field      | Type   | Rules                      |
| ---------- | ------ | -------------------------- |
| `email`    | string | valid email, required      |
| `password` | string | min 8 characters, required |

curl:

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"farmer@example.com","password":"SecurePass123"}'
```

Success `201`:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { "id": 2, "email": "farmer@example.com" }
}
```

Error `409` (duplicate email):

```json
{
  "success": false,
  "error": { "code": "CONFLICT", "message": "An account with this email already exists" }
}
```

### POST /auth/login

Auth required: No

| Field      | Type   | Rules                 |
| ---------- | ------ | --------------------- |
| `email`    | string | valid email, required |
| `password` | string | required              |

curl:

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@farmapi.dev","password":"Password123!"}'
```

Success `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "expiresIn": "1h" }
}
```

Error `401` (wrong email or password — identical message either way):

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" }
}
```

### GET /farms

Auth required: No

Query params:

| Param       | Type    | Rules                                                          |
| ----------- | ------- | -------------------------------------------------------------- |
| `page`      | integer | ≥ 1, default `1`                                               |
| `limit`     | integer | 1–100, default `10`                                            |
| `location`  | string  | case-insensitive partial match                                 |
| `crop_type` | string  | case-insensitive partial match                                 |
| `search`    | string  | case-insensitive partial match on `name`                       |
| `sort`      | enum    | `name` \| `area_hectare` \| `created_at`, default `created_at` |
| `order`     | enum    | `asc` \| `desc`, default `desc`                                |

Filters combine with AND.

curl:

```bash
curl -s "http://localhost:3000/farms?page=1&limit=5&crop_type=padi&sort=area_hectare&order=asc"
```

Success `200`:

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

Error `400` (invalid query, e.g. `limit=500`):

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

**Pagination meta object**: `page` (current page), `limit` (page size), `totalItems`
(total matching rows), `totalPages` (`ceil(totalItems / limit)`).

### GET /farms/:id

Auth required: No

| Param | Type           | Rules                        |
| ----- | -------------- | ---------------------------- |
| `id`  | integer (path) | positive integer, else `400` |

curl:

```bash
curl -s http://localhost:3000/farms/1
```

Success `200`:

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

Auth required: **Yes** (`Authorization: Bearer <token>`)

Body (unknown fields rejected):

| Field          | Type   | Rules                 |
| -------------- | ------ | --------------------- |
| `name`         | string | required, 1–100 chars |
| `location`     | string | optional, ≤150 chars  |
| `area_hectare` | number | optional, positive    |
| `crop_type`    | string | optional, ≤50 chars   |

curl:

```bash
curl -s -i -X POST http://localhost:3000/farms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sawah Makmur Jaya","location":"Malang, Jawa Timur","area_hectare":12.5,"crop_type":"padi"}'
```

Success `201` (also returns a `Location: /farms/<id>` header):

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

Error `401` (missing/invalid token):

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid Authorization header" }
}
```

### PUT /farms/:id

Auth required: **Yes**. Full-update semantics — same validation as `POST` (`name` required); `updated_at` is refreshed.

curl:

```bash
curl -s -X PUT http://localhost:3000/farms/15 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Sawah Makmur Jaya Updated","location":"Malang, Jawa Timur","area_hectare":15,"crop_type":"jagung"}'
```

Success `200`:

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

Auth required: **Yes**

curl:

```bash
curl -s -i -X DELETE http://localhost:3000/farms/15 \
  -H "Authorization: Bearer $TOKEN"
```

Success: `204 No Content` (empty body).

Error `404`:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Farm with id 999 not found" }
}
```

### Error codes

| Code               | HTTP status | Meaning                                           |
| ------------------ | ----------- | ------------------------------------------------- |
| `VALIDATION_ERROR` | 400         | Request body/query/params failed validation       |
| `UNAUTHORIZED`     | 401         | Missing/invalid/expired token, or bad credentials |
| `NOT_FOUND`        | 404         | Resource or route does not exist                  |
| `CONFLICT`         | 409         | Resource already exists (duplicate email)         |
| `RATE_LIMITED`     | 429         | Too many requests in the current window           |
| `INTERNAL_ERROR`   | 500         | Unexpected server error                           |

## Error Handling

Every response — success or failure — uses the same envelope shape.

Success:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
```

(`meta` is present only on paginated list endpoints.)

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

This includes unmatched routes (`404 NOT_FOUND` via the `notFound` middleware),
rate-limit rejections (`429 RATE_LIMITED`), and malformed JSON bodies (`400
VALIDATION_ERROR`). In production, unexpected (`500`) errors never leak stack
traces or internal messages to the client — they are logged server-side and a
generic message is returned instead.

## Testing

```bash
npm test              # run the full Jest + Supertest suite
npm run test:coverage # same, with a coverage report
```

Tests run against an isolated in-memory SQLite database (`DB_PATH=:memory:`,
set in `tests/env.setup.js`) — they never touch the development database file.

Coverage includes:

- `GET /health`
- Auth: register success/duplicate/invalid body, login success/wrong password (identical message, constant-time)
- Farms happy paths: create (+ `Location` header), list (+ `meta`), get by id, update, delete
- Farms error paths: missing/invalid/expired/forged/`alg:none` token, missing/empty/whitespace/over-length `name`, invalid `area_hectare`, unknown fields, mass-assignment of system fields, non-integer/negative/zero/decimal id, 404 on GET/PUT/DELETE
- Pagination meta correctness, the `limit`/`page` boundary validation, and no-match filters returning `200` with an empty array
- Filtering by `location`, `crop_type`, `search`, combined AND filters, and `sort`/`order` (including actual ordering verification and invalid-value rejection)
- Cross-cutting: unknown-route and unsupported-method envelopes, malformed JSON, oversized body, both rate limiters returning the `RATE_LIMITED` envelope, and config fail-fast validation at boot

## Docker

```bash
# Build and run via Docker Compose (reads JWT_SECRET etc. from your shell env or a .env file)
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build

# Or build/run the image directly
docker build -t farm-management-api .
docker run -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e CORS_ORIGIN=http://localhost:3000 \
  farm-management-api
```

The container runs as a non-root user, exposes port `3000`, persists the
SQLite file in a named volume (`farm-data`), and defines a `HEALTHCHECK` that
polls `GET /health`.

## API Docs

- Interactive Swagger UI: [`GET /docs`](http://localhost:3000/docs), generated from `docs/openapi.yaml` (OpenAPI 3.0).
- Postman collection: [`docs/postman_collection.json`](docs/postman_collection.json) — import it into Postman, set the `token` collection variable after calling **Login** (a test script sets it automatically), and exercise every endpoint.

## Design Decisions

- **SQLite / better-sqlite3**: for a single-service CRUD API of this scope, a
  zero-config, file-based, synchronous database removes an entire class of
  operational concerns (connection pools, network latency, async race
  conditions) while still enforcing real SQL constraints and using genuine
  prepared statements. `better-sqlite3`'s synchronous API also simplifies the
  service/repository layers (no `await` scattered through simple queries) and
  makes tests fast and fully isolated via `:memory:` databases.
- **Layered architecture** (routes → controllers → services → repositories):
  keeps HTTP concerns, business rules, and SQL each in one place, so any layer
  can be tested or replaced independently. Controllers stay thin; all SQL is
  confined to `repositories/`, which is what makes "zero string concatenation
  of user input into SQL" straightforward to guarantee and review.
- **Zod**: schemas double as documentation, coerce query-string types safely
  (e.g. `page=2` → `2`), and reject unknown fields (`.strict()`) so typos in
  request bodies fail loudly instead of being silently ignored.
- **No `/api/v1` prefix**: the brief specifies exact literal paths
  (`/farms`, `/auth/...`, `/health`, `/docs`), so no version prefix was added.
  In a real production rollout, introducing `/api/v1/...` (or an `Accept`
  header-based scheme) would be one of the first hardening steps once a
  second API version is anticipated.
- **Security**: `helmet` for standard secure headers, `cors` restricted to an
  explicit origin allow-list (with `*` rejected outright in production),
  general + auth-specific rate limiting to slow brute-force attempts, a 10kb
  JSON body limit, bcrypt (cost 10) for password hashing, and fail-fast Zod
  validation of environment variables at boot so misconfiguration is caught
  immediately rather than at request time.

## Project Status & Future Improvements

This project satisfies the brief end-to-end and is ready for review. Honest
list of what a real production rollout would add next:

- Refresh tokens / token revocation (current JWTs are stateless and can't be invalidated before expiry)
- Role-based access control (RBAC) — today any authenticated user can write any farm
- Migration to PostgreSQL for multi-instance/horizontal scaling
- CI/CD pipeline that also builds and deploys the Docker image
- Request-id propagation and structured (JSON) logging for observability
- API versioning (`/api/v1`) once a breaking change is needed

## Author

**Muhammad Ahnaf**
GitHub: [github.com/Ahnafprojects](https://github.com/Ahnafprojects)

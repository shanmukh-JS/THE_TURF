# TRUF GAMING 🏏

> **This repository values correctness over convenience, clarity over cleverness, and documentation over assumption. Every financial event must be explainable, every balance reproducible, and every architectural decision understandable.**

> **Premium Cricket Box Booking Marketplace**
> Connects cricket players with cricket box owners. Built like Airbnb, for cricket.

---

## Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Monorepo         | Turborepo + pnpm workspaces                                   |
| Frontend & API   | Next.js 16 (App Router), Tailwind CSS, Zustand, Framer Motion |
| Database         | Supabase Postgres                                             |
| Cache / Locks    | Redis (ioredis)                                               |
| Background Jobs  | BullMQ                                                        |
| Payments         | Razorpay                                                      |
| Media/Documents  | Supabase Storage                                              |
| OTP / SMS        | Twilio (WhatsApp OTP)                                         |
| Auth             | Supabase Auth (GoTrue)                                        |
| Containerization | Docker + Docker Compose (for local Redis/Postgres services)   |

---

## Project Structure

```
truf-gaming/
├── apps/
│   └── web/          # Next.js customer + owner + admin UI and API Handlers
├── packages/
│   ├── ui/           # Shared component library
│   ├── eslint-config/
│   ├── typescript-config/
│   ├── types/        # Shared TypeScript types
│   └── validation/   # Zod validation schemas
├── supabase/         # Supabase local config & migrations
├── docker-compose.yml
├── turbo.json
└── .env.example
```

---

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Docker Desktop (for Redis / Supabase local)
- pnpm (v9+)
- Supabase CLI (optional, for local DB development)

### 2. Clone & Install

```bash
git clone https://github.com/your-org/truf-gaming.git
cd truf-gaming
pnpm install
```

### 3. Set Up Environment

```bash
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase credentials, Redis URL, Twilio, and Razorpay keys
```

### 4. Start Infrastructure (Docker)

```bash
docker-compose up -d
# Starts Redis on :6379 (used for BullMQ jobs and lock mechanism)
```

### 5. Run Database Migrations

Use Supabase CLI to apply migrations to your local or remote database:

```bash
# To run local development database migrations:
supabase migration up
```

### 6. Start Development Servers

```bash
pnpm dev
# Starts Next.js development server on port 3000
```

---

## API Reference

Base URL: `http://localhost:3000/api`

All responses follow the contract:

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "error": { "code": "ERR_CODE", "message": "..." } }
```

| Method | Endpoint                       | Auth        | Description                 |
| ------ | ------------------------------ | ----------- | --------------------------- |
| POST   | `/auth/register`               | —           | Register customer or owner  |
| POST   | `/auth/login`                  | —           | Login, retrieve session     |
| GET    | `/venues`                      | —           | List approved venues        |
| POST   | `/venues`                      | OWNER       | Create venue draft          |
| PATCH  | `/api/admin/venues/:id/status` | SUPER_ADMIN | Approve / reject venue      |
| GET    | `/slots/available`             | —           | Get available slots         |
| POST   | `/bookings/lock`               | CUSTOMER    | Lock a slot (10 min TTL)    |
| POST   | `/bookings`                    | CUSTOMER    | Create booking (after lock) |
| POST   | `/payments/verify`             | CUSTOMER    | Verify Razorpay payment     |

---

## Booking Flow

```
Customer selects slot
       ↓
POST /api/bookings/lock  →  Redis SETNX lock:slot:{id} (10 min TTL)
       ↓
POST /api/bookings       →  Booking created (status: PENDING)
       ↓
Razorpay checkout in browser
       ↓
Razorpay Webhook     →  Signature verified → Booking (status: CONFIRMED)
       ↓
BullMQ Worker        →  Commission calculated, SMS/Email sent
```

---

## Available Routes (Frontend)

| Route     | Description              |
| --------- | ------------------------ |
| `/`       | Customer landing page    |
| `/venues` | Browse all cricket boxes |
| `/owner`  | Owner dashboard          |
| `/admin`  | Super Admin CRM          |

---

## Commission Model

TRUF GAMING earns **10%** of every booking as a platform commission.
The remaining **90%** is settled to the venue owner's bank account.

---

## License

UNLICENSED — Private. All rights reserved © TRUF GAMING.

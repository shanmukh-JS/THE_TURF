# TRUF GAMING 🏏

> **Premium Cricket Box Booking Marketplace**
> Connects cricket players with cricket box owners. Built like Airbnb, for cricket.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js 14 (App Router), Tailwind CSS, Zustand, Framer Motion |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / Locks | Redis |
| Background Jobs | BullMQ |
| Payments | Razorpay |
| Real-time | Socket.IO |
| Media | Cloudinary |
| SMS | Twilio |
| Auth | JWT (Access + Refresh Tokens) |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
truf-gaming/
├── apps/
│   ├── web/          # Next.js customer + owner + admin UI
│   └── api/          # Express REST API
├── packages/
│   ├── database/     # Prisma schema & migrations
│   ├── ui/           # Shared component library
│   ├── eslint-config/
│   └── typescript-config/
├── docker-compose.yml
├── turbo.json
└── .env.example
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- Docker Desktop (for PostgreSQL & Redis)
- npm

### 2. Clone & Install
```bash
git clone https://github.com/your-org/truf-gaming.git
cd truf-gaming
npm install
```

### 3. Set Up Environment
```bash
cp .env.example apps/api/.env
# Edit apps/api/.env with your credentials
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with NEXT_PUBLIC_ keys only
```

### 4. Start Infrastructure (Docker)
```bash
docker-compose up -d
# Starts PostgreSQL on :5432 and Redis on :6379
```

### 5. Run Database Migrations
```bash
npm run db:migrate -w @truf-gaming/database
```

### 6. Start Development Servers
```bash
npm run dev
# Starts both Next.js (:3000) and Express API (:3001) simultaneously
```

---

## API Reference

Base URL: `http://localhost:3001/api/v1`

All responses follow the contract:
```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "error": { "code": "ERR_CODE", "message": "..." } }
```

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register customer or owner |
| POST | `/auth/login` | — | Login, receive JWT |
| GET | `/venues` | — | List approved venues |
| POST | `/venues` | OWNER | Create venue draft |
| PATCH | `/venues/:id/status` | SUPER_ADMIN | Approve / reject venue |
| GET | `/slots/available` | — | Get available slots |
| POST | `/bookings/lock` | CUSTOMER | Lock a slot (10 min TTL) |
| POST | `/bookings` | CUSTOMER | Create booking (after lock) |
| POST | `/payments/verify` | CUSTOMER | Verify Razorpay payment |
| GET | `/healthz` | — | API health check |

---

## Booking Flow

```
Customer selects slot
       ↓
POST /bookings/lock  →  Redis SETNX lock:slot:{id} (10 min TTL)
       ↓
POST /bookings       →  Booking created (status: PENDING)
       ↓
Razorpay checkout in browser
       ↓
Razorpay Webhook     →  Signature verified → Booking (status: CONFIRMED)
       ↓
BullMQ Worker        →  Commission calculated, SMS/Email sent
```

---

## Available Routes (Frontend)

| Route | Description |
|---|---|
| `/` | Customer landing page |
| `/venues` | Browse all cricket boxes |
| `/owner` | Owner dashboard |
| `/admin` | Super Admin CRM |

---

## Commission Model

TRUF GAMING earns **10%** of every booking as a platform commission.
The remaining **90%** is settled to the venue owner's bank account.

---

## License

UNLICENSED — Private. All rights reserved © TRUF GAMING.

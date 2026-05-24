# Inventory Reservation System

A concurrency-safe inventory reservation platform built with Next.js, Prisma, PostgreSQL, and Tailwind CSS.

---

# Overview

This project prevents overselling inventory during checkout by implementing temporary stock reservations.

When a customer proceeds to checkout:

- stock is temporarily reserved
- reservation expires automatically after 10 minutes
- successful payment confirms reservation
- cancelled/expired reservations release stock back to inventory

The system safely handles concurrent reservation requests using PostgreSQL transactions and row-level locking.

---

# Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- shadcn/ui
- Zod validation

---

# Features

## Backend

- Products API
- Warehouses API
- Inventory API
- Reservation API
- Reservation confirmation
- Reservation release
- Expired reservation cleanup
- Zod request validation
- Serializable database transactions
- PostgreSQL row locking (`FOR UPDATE`)
- Concurrency-safe reservation handling

## Frontend

- Product listing page
- Warehouse inventory display
- Reservation checkout page
- Live countdown timer
- Real-time polling updates
- Optimistic UI updates
- Reservation status badges
- 409 conflict handling
- 410 expiry handling

---

# Concurrency Protection

To prevent race conditions during simultaneous reservations:

- inventory updates run inside Prisma transactions
- PostgreSQL `FOR UPDATE` row locks are used
- Serializable isolation level is enabled

This guarantees:

- only one user can reserve the final unit
- competing requests receive `409 Conflict`

Reservation flow:

1. Begin transaction
2. Lock inventory row
3. Validate stock availability
4. Increment reserved stock
5. Create reservation
6. Commit transaction

---

# Reservation Expiry Handling

Reservations automatically expire after 10 minutes.

Expired reservations are released using a lazy cleanup strategy:

- cleanup runs before inventory/reservation reads
- reserved stock is returned automatically

This avoids requiring a separate worker or cron job.

---

# API Endpoints

## Products

```http
GET /api/products
```

Returns products with warehouse stock availability.

---

## Warehouses

```http
GET /api/warehouses
```

Returns all warehouses.

---

## Inventory

```http
GET /api/inventory
```

Returns inventory information.

---

## Create Reservation

```http
POST /api/reservations
```

Creates temporary reservation.

Possible responses:

- `201 Created`
- `409 Conflict`

---

## Confirm Reservation

```http
POST /api/reservations/:id/confirm
```

Confirms reservation after payment success.

Possible responses:

- `200 OK`
- `410 Gone`

---

## Release Reservation

```http
POST /api/reservations/:id/release
```

Releases reservation early.

---

# Frontend Features

## Product Page

- Reserve inventory
- Real-time inventory polling
- Availability indicators
- Optimistic updates

## Reservation Page

- Live countdown timer
- Confirm purchase
- Cancel reservation
- Automatic refresh
- Expiry handling

---

# Setup Instructions

## Install dependencies

```bash
npm install
```

---

## Configure environment variables

Create `.env`:

```env
DATABASE_URL=
DIRECT_URL=
```

---

## Run Prisma migrations

```bash
npx prisma migrate dev
```

---

## Start development server

```bash
npm run dev
```

---

# Deployment

Frontend:
- Vercel

Database:
- PostgreSQL

---

# Tradeoffs

- Lazy cleanup was chosen instead of cron jobs to reduce infrastructure complexity.
- Serializable transactions prioritize correctness over throughput.
- Polling was used instead of WebSockets for simplicity.

---

# Future Improvements

- Redis-based idempotency keys
- WebSocket inventory updates
- Admin dashboard
- Reservation analytics
- Background cleanup workers
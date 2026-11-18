# ReserveHub | Enterprise Meeting Room Booking System

> Production-grade, full-stack Meeting Room Booking System engineered with React 18, NestJS 10, and PostgreSQL 18. Built with strict mathematical PostgreSQL GiST exclusion constraints to guarantee zero overlapping bookings under high concurrency.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Versions](#tech-stack--versions)
3. [System Architecture](#system-architecture)
4. [End-to-End Request Flow](#end-to-end-request-flow)
5. [The Core Guarantee: Overlap Prevention](#the-core-guarantee-overlap-prevention)
6. [Automated Reminders & Concurrency Control](#automated-reminders--concurrency-control)
7. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
8. [Quick Start (Clean Clone to Running App)](#quick-start-clean-clone-to-running-app)
9. [Pre-Seeded Demo Credentials](#pre-seeded-demo-credentials)
10. [Database Migrations & Seeding](#database-migrations--seeding)
11. [Running Test Suites](#running-test-suites)
12. [API Reference & Swagger](#api-reference--swagger)
13. [Directory Layout](#directory-layout)
14. [Design Decisions & Known Limitations](#design-decisions--known-limitations)

---

## 1. Project Overview

**ReserveHub** is an enterprise meeting room scheduling platform designed to handle multi-room, multi-department corporate workspaces. It solves the critical double-booking race condition by shifting concurrency authority to the PostgreSQL engine using a **Generalized Search Tree (GiST) Exclusion Constraint**.

### Key Features
- **Deterministic Booking Rules**: Enforces 30-minute grid alignment, minimum 30-minute duration, maximum 4-hour duration, future booking limits (up to 90 days), and office business hours (`07:00 - 22:00 Asia/Kolkata`, 7 days/week).
- **Mathematical Zero-Overlap Guarantee**: Confirmed bookings in the same room cannot overlap by even one millisecond, verified under concurrent load.
- **Immediate Slot Release**: Cancelling a booking instantly releases the time window for other employees.
- **Smart Rescheduling**: Bookings can be modified to overlap their own existing time range without triggering self-conflict.
- **Live Room Telemetry**: Room cards display real-time availability badges (`Available Now`, `In use until HH:mm`, or `Maintenance`).
- **FullCalendar Integration**: Custom dark-themed multi-view schedule (Month, Week, Day) with per-room color accents.
- **Admin Command Center**: Real-time KPI cards, 30-day booking trends, per-room utilization charts, demand heatmaps, and role management with self-lockout prevention.
- **Automated Reminder Cron**: Atomic scanning every minute using `FOR UPDATE SKIP LOCKED` to prevent duplicate notifications across horizontally scaled instances.

---

## 2. Tech Stack & Versions

| Layer | Technologies |
|---|---|
| **Frontend** | React 18.3, Vite 6.0, TypeScript 5.6, Tailwind CSS 3.4, TanStack Query v5, React Hook Form, Zod, FullCalendar v6 (DayGrid, TimeGrid, Interaction), Recharts 2.14, Lucide React, Sonner (Toasts), `@fontsource/manrope`, `@fontsource/jetbrains-mono` |
| **Backend** | NestJS 10.4, Express, TypeScript 5.6 (strict mode), TypeORM 0.3 (`synchronize: false`), Passport-JWT, Bcrypt, Class-Validator, Class-Transformer, NestJS Throttler, NestJS Schedule, Helmet, Cookie-Parser, Luxon 3.5, Swagger / OpenAPI |
| **Database** | PostgreSQL 18 (or 16 via Docker), `btree_gist` extension, `citext` extension, UUID primary keys (`gen_random_uuid()`), `timestamptz` |
| **Testing** | Jest 29, Supertest 7, Vitest 2.1, React Testing Library, JSDOM |

---

## 3. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Tier (React 18 SPA)"]
        UI["React SPA (Vite + Tailwind CSS)"]
        RQ["TanStack Query (Cache & State)"]
        Axios["Axios Client + Refresh Interceptor"]
        UI --> RQ --> Axios
    end

    subgraph Gateway["API & Security Tier (NestJS)"]
        API["NestJS Core API (/api/v1)"]
        Guards["JwtAuthGuard (Global) & RolesGuard"]
        Filters["GlobalExceptionFilter (Error Normalizer)"]
        Pipes["ValidationPipe (Whitelist & DTO Transform)"]
        Axios -->|Bearer JWT / Cookies| API
        API --> Guards --> Pipes --> Filters
    end

    subgraph Modules["Domain Logic Tier"]
        AuthMod["AuthModule (JWT & Refresh Rotation)"]
        RoomsMod["RoomsModule (Catalog & Availability Grid)"]
        BookingsMod["BookingsModule (Validation & Lifecycle)"]
        StatsMod["StatsModule (Analytics & Aggregates)"]
        RemindersMod["RemindersModule (Cron Job)"]
        Filters --> AuthMod & RoomsMod & BookingsMod & StatsMod & RemindersMod
    end

    subgraph Database["Data Tier (PostgreSQL 18)"]
        UsersTbl[("users (citext email)")]
        TokensTbl[("refresh_tokens (hashed)")]
        RoomsTbl[("rooms (soft-delete)")]
        BookingsTbl[("bookings (GiST Exclude)")]
        NotifsTbl[("notifications (in-app)")]

        AuthMod --> UsersTbl & TokensTbl
        RoomsMod --> RoomsTbl
        BookingsMod --> BookingsTbl
        RemindersMod -->|SKIP LOCKED| BookingsTbl
        RemindersMod --> NotifsTbl
    end
```

---

## 4. End-to-End Request Flow

Understanding the path of a reservation request from the button click to the database and back:

1. **User Action**: The employee selects Room A on Monday at 10:00–11:00 and clicks **Confirm Reservation**.
2. **Client Validation**: Zod verifies that `title` is 3–120 characters, `date` is present, `endTime > startTime`, and `attendeeCount <= room.capacity`.
3. **HTTP Transport**: Axios attaches the in-memory JWT Bearer token and sends `POST /api/v1/bookings`.
4. **Security & Guarding**:
   - NestJS `JwtAuthGuard` extracts and verifies the JWT token.
   - User account status is checked (`isActive: true`).
5. **Payload Parsing**: Global `ValidationPipe` strips non-whitelisted properties and transforms values into the `CreateBookingDto`.
6. **Service Layer Invariants**:
   - Start and end timestamps are validated using `luxon` in the `Asia/Kolkata` office timezone.
   - Asserts 30-minute boundary alignment (`:00` or `:30`, `00` seconds).
   - Asserts meeting duration between 30 and 240 minutes.
   - Asserts time falls within business hours (`08:00 - 20:00`) and business days (Monday–Friday).
   - Verifies the room is `ACTIVE` and not marked for `MAINTENANCE`.
7. **Database Atomic Execution**:
   - Direct `INSERT` executed into the `bookings` table.
   - PostgreSQL runs the `bookings_no_overlap` GiST exclusion index check:
     $$\text{room\_id} = \text{target} \quad \land \quad [\text{start}_1, \text{end}_1) \cap [\text{start}_2, \text{end}_2) \neq \emptyset$$
   - If an overlapping confirmed booking exists, PostgreSQL immediately aborts the insert with error code `23P01`.
8. **Exception Normalization**:
   - `GlobalExceptionFilter` intercepts error `23P01`, identifies the conflicting range, and formats a friendly HTTP 409 Conflict response.
9. **Client UI State Update**:
   - On success: TanStack Query cache is invalidated, Sonner shows a success toast, and the calendar / list refetches.
   - On conflict (409): The modal displays an inline warning banner explaining the exact conflict, and re-queries the day's busy slots.
10. **Silent Token Refresh (When Expired)**:
   - If the access token expires (15m TTL), Axios intercepts the 401, issues a `POST /api/v1/auth/refresh` using the secure `httpOnly` cookie, receives a rotated token pair, updates memory, and replays the original request transparently without user disruption.

---

## 5. The Core Guarantee: Overlap Prevention

Race conditions cannot be solved reliably with application-level `SELECT ... WHERE ...` followed by `INSERT`, because two simultaneous requests can both observe the slot as free before either commits.

ReserveHub implements PostgreSQL's native **GiST Exclusion Constraint**:

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  room_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (status = 'CONFIRMED');
```

### Why this design works:
- **`room_id WITH =`**: Only bookings in the *same* room are evaluated against each other. Concurrent bookings in different rooms are allowed.
- **`tstzrange(start_time, end_time, '[)') WITH &&`**: Represents time as a half-open mathematical interval $[start, end)$. The `&&` operator checks for set overlap.
- **Half-open `[)` interval**: Allows seamless **back-to-back bookings**. For example, 10:00–11:00 and 11:00–12:00 share the boundary `11:00`, but do not overlap.
- **Partial Index `WHERE (status = 'CONFIRMED')`**: Cancelled bookings (`status = 'CANCELLED'`) are automatically omitted from the index. When a meeting is cancelled, its time slot is mathematically released and immediately available.
- **Self-Overlapping Reschedules**: When a booking is updated via `UPDATE bookings SET start_time = ..., end_time = ... WHERE id = ...`, PostgreSQL evaluates the exclusion constraint against all *other* rows, allowing an organizer to extend their meeting (e.g. 10:00–11:00 extended to 10:00–11:30) without conflicting with their own reservation.

---

## 6. Automated Reminders & Concurrency Control

Meeting reminders run via `@nestjs/schedule` every minute. In production environments with multiple application containers, scheduled jobs must not produce duplicate notifications.

ReserveHub uses **atomic row claiming with lock skipping**:

```sql
UPDATE bookings
SET reminder_sent_at = now()
WHERE id IN (
  SELECT id FROM bookings
  WHERE status = 'CONFIRMED'
    AND reminder_sent_at IS NULL
    AND reminder_minutes_before > 0
    AND start_time > now()
    AND start_time - (reminder_minutes_before * interval '1 minute') <= now()
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

1. **`FOR UPDATE SKIP LOCKED`**: Selects only bookings whose reminder window has arrived, locking them for the transaction. If another replica is currently processing rows, those locked rows are skipped without blocking.
2. **`reminder_sent_at = now()`**: Updated atomically in the same statement. Once set, the row is never re-selected on subsequent runs.
3. **Reschedule Reset**: When a user reschedules a meeting to a future slot, `reminder_sent_at` is reset to `NULL`, ensuring a new reminder will fire before the rescheduled time.
4. **Cancelled Exclusion**: Cancelled bookings have `status = 'CANCELLED'` and are excluded from the scan.

---

## 7. Prerequisites & Environment Setup

- **Node.js**: v20+ or v22+ (`node -v`)
- **npm**: v10+ (`npm -v`)
- **PostgreSQL**: v16+ or v18+ running locally or in Docker.

### Environment Configuration

#### Backend (`backend/.env`):
```env
PORT=3000
NODE_ENV=development

# Database connection URL (PostgreSQL 18 local port 5433 or 5432)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/meeting_room_booking_db
DATABASE_TEST_URL=postgresql://postgres:postgres@localhost:5433/meeting_room_booking_test_db

# Security & JWT Tokens
JWT_ACCESS_SECRET=meeting_room_booking_jwt_access_secret_key_2026_super_secure!
JWT_REFRESH_SECRET=meeting_room_booking_jwt_refresh_secret_key_2026_super_secure!
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# CORS Allowed Origin
FRONTEND_ORIGIN=http://localhost:5173

# Business Rules & Office Hours
OFFICE_TIMEZONE=Asia/Kolkata
BUSINESS_HOURS_START=07:00
BUSINESS_HOURS_END=22:00
BUSINESS_DAYS=1,2,3,4,5,6,7

# Optional SMTP Settings (leave empty for in-app notifications only)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@company.com
```

#### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 8. Quick Start (Clean Clone to Running App)

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Step 2: Start PostgreSQL Database

You can start the database either via Docker or using your local PostgreSQL instance:

**Option A (Docker - Recommended):**
```bash
docker compose up -d db
```
*Note: Docker Compose maps container port 5432 to host port 5433 to match `DATABASE_URL`.*

**Option B (Local PostgreSQL / Windows Service):**
```bash
# Optional: Set PGDATA_DIR if using custom data cluster directory
set PGDATA_DIR=C:\path\to\your\pgdata

# Start local PostgreSQL on port 5433
npm run db:start
# or run: start-db.bat
```

### Step 3: Run Database Migrations
Ensure PostgreSQL is running on port 5433, then execute:
```bash
npm run migration:run
```

### Step 4: Populate Database Seed Data
Populate realistic rooms, users, and 34+ non-overlapping bookings:
```bash
npm run seed
```

### Step 5: Start the Applications
```bash
# Terminal 1: Start Backend API (Port 3000)
cd backend
npm run start:dev

# Terminal 2: Start Frontend Web App (Port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** in your browser.
Swagger API documentation is available at **http://localhost:3000/api/docs**.

---

## 9. Pre-Seeded Demo Credentials

The database seed script sets up real accounts for immediate demonstration:

| Account Role | Email Address | Password | Department |
|---|---|---|---|
| **Administrator** | `admin@company.com` | `Admin@12345` | IT & Operations |
| **Employee** | `alex.chen@company.com` | `Password@123` | Engineering |
| **Employee** | `priya.patel@company.com` | `Password@123` | Product Design |
| **Employee** | `marcus.johnson@company.com` | `Password@123` | Marketing |
| **Employee** | `elena.rostova@company.com` | `Password@123` | Finance |
| **Employee** | `david.kim@company.com` | `Password@123` | Human Resources |

*Note: The login page includes one-click "Demo Fast-Fill" buttons for both Admin and Employee.*

---

## 10. Database Migrations & Seeding

The application strictly adheres to `synchronize: false` in TypeORM.

```bash
# Execute pending hand-written SQL migrations
npm run migration:run

# Revert the latest migration
npm run migration:revert

# Run idempotent seed script
npm run seed

# Full reset: Truncate tables and re-seed
npm run db:reset
```

---

## 11. Running Test Suites

### Backend Tests
```bash
cd backend

# Run unit tests (date-time validations, business hours, role guards)
npm run test

# Run E2E & Concurrency tests (requires PostgreSQL running)
npm run test:e2e
```

#### What `npm run test:e2e` tests:
- **Mandatory Overlap Scenarios**:
  - (a) Exact same slot rejected (409)
  - (b) Partial overlap start rejected (409)
  - (c) Partial overlap end rejected (409)
  - (d) Fully contained window rejected (409)
  - (e) Fully containing window rejected (409)
  - (f) Back-to-back bookings allowed (201)
  - (g) Overlapping booking in different room allowed (201)
  - (h) Slot release upon cancellation verified (201)
  - (i) Reschedule into conflict returns 409, original unchanged
  - (j) Extending booking over its own slot succeeds (200)
  - (k) **12 concurrent requests** fired with `Promise.all`: exactly ONE 201 created, 11 rejected with 409, exactly 1 row in DB.
  - (l) Direct raw SQL INSERT exclusion violation `23P01` confirmed.
- **Reminders Atomicity**:
  - Claims due bookings atomically; prevents duplicate notifications on rerun; ignores cancelled bookings.
- **Auth & Lifecycle**:
  - Registration, login, token rotation, logout, deactivated account rejection, room CRUD, ownership enforcement.

### Frontend Tests
```bash
cd frontend

# Run Vitest + React Testing Library suite
npm run test
```

---

## 12. API Reference & Swagger

Interactive Swagger UI documentation is hosted at:
👉 **`http://localhost:3000/api/docs`**

### Summary of REST Endpoints

| Category | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Employee registration |
| | `POST` | `/api/v1/auth/login` | Public | Sign in and set httpOnly cookie |
| | `POST` | `/api/v1/auth/refresh` | Public (Cookie) | Rotate refresh token |
| | `POST` | `/api/v1/auth/logout` | Authenticated | Revoke session & clear cookie |
| | `GET` | `/api/v1/auth/me` | Authenticated | Current profile |
| | `PATCH` | `/api/v1/auth/me` | Authenticated | Update name/department |
| | `PATCH` | `/api/v1/auth/change-password` | Authenticated | Change password |
| **Rooms** | `GET` | `/api/v1/rooms` | Authenticated | List rooms with live availability |
| | `GET` | `/api/v1/rooms/:id` | Authenticated | Room specifications |
| | `GET` | `/api/v1/rooms/:id/availability` | Authenticated | Busy intervals & 30m free slots |
| | `POST` | `/api/v1/rooms` | Admin | Create room |
| | `PATCH` | `/api/v1/rooms/:id` | Admin | Update room specifications |
| | `DELETE` | `/api/v1/rooms/:id` | Admin | Soft-delete room (with cancel option) |
| **Bookings**| `POST` | `/api/v1/bookings` | Authenticated | Book a room (enforces GiST) |
| | `GET` | `/api/v1/bookings/mine` | Authenticated | My bookings (upcoming/past/cancelled) |
| | `GET` | `/api/v1/bookings/:id` | Owner / Admin | Booking details |
| | `PATCH` | `/api/v1/bookings/:id/reschedule` | Owner / Admin | Reschedule slot |
| | `PATCH` | `/api/v1/bookings/:id/cancel` | Owner / Admin | Cancel booking & release slot |
| | `GET` | `/api/v1/bookings/calendar` | Authenticated | FullCalendar event feed |
| | `GET` | `/api/v1/bookings` | Admin | Enterprise-wide bookings registry |
| **Users** | `GET` | `/api/v1/users` | Admin | Paginated user directory |
| | `PATCH` | `/api/v1/users/:id` | Admin | Change role or toggle activation |
| **Notifs** | `GET` | `/api/v1/notifications` | Authenticated | In-app notification center |
| | `GET` | `/api/v1/notifications/unread-count` | Authenticated | Unread count badge |
| | `PATCH` | `/api/v1/notifications/read-all` | Authenticated | Mark all notifications read |
| | `PATCH` | `/api/v1/notifications/:id/read` | Authenticated | Mark single notification read |
| **Stats** | `GET` | `/api/v1/stats/me` | Authenticated | Employee dashboard summary |
| | `GET` | `/api/v1/stats/overview` | Admin | High-level utilization KPIs |
| | `GET` | `/api/v1/stats/bookings-per-day` | Admin | 30-day volume breakdown |
| | `GET` | `/api/v1/stats/room-utilization` | Admin | Per-room utilization rates |
| | `GET` | `/api/v1/stats/peak-hours` | Admin | Hour x Weekday demand heatmap |
| | `GET` | `/api/v1/stats/top-rooms` | Admin | Top 5 booked spaces |
| **Health**| `GET` | `/api/v1/health` | Public | Database ping |

---

## 13. Directory Layout

```
SFT booking system/
├── README.md                  # Comprehensive technical documentation
├── docker-compose.yml         # Containerized PostgreSQL service
├── package.json               # Monorepo root scripts
├── docs/
│   ├── DECISIONS.md           # Architecture Decisions Log
│   └── PLAN.md                # System Implementation Plan
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── ormconfig.ts
│   ├── .env.example
│   ├── .env
│   ├── src/
│   │   ├── main.ts            # NestJS entrypoint (Helmet, CORS, Swagger)
│   │   ├── app.module.ts      # Application module assembly
│   │   ├── common/            # Guards, filters, decorators, date-time utilities
│   │   ├── database/          # TypeORM DataSource, migrations, seeds
│   │   └── modules/           # auth, users, rooms, bookings, notifications, reminders, stats, health
│   └── test/                  # E2E test suites (overlap, concurrency, reminders, lifecycle)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx           # React entrypoint
        ├── App.tsx            # Route configuration
        ├── index.css          # Design system tokens & FullCalendar dark overrides
        ├── api/               # Axios client, types, endpoints
        ├── context/           # AuthContext, BookingModalContext
        ├── components/        # Shell, Sidebar, TopBar, BookingModal, RescheduleModal
        ├── pages/             # Auth, Dashboard, Rooms, Calendar, MyBookings, Admin
        └── test/              # Vitest + RTL test suites
```

---

## 14. Design Decisions & Known Limitations

### Design Decisions
1. **PostgreSQL GiST Constraint as Final Authority**: We do not rely on "SELECT then INSERT" race conditions. The database constraint guarantees zero overlaps even during network partitions or simultaneous multi-instance writes.
2. **Refresh Token Rotation**: Refresh tokens are stored hashed in PostgreSQL with expiration and revocation timestamps. Each refresh invalidates the old token and issues a new pair, mitigating replay attacks.
3. **Office Timezone Normalization**: All business rules (grid alignment, 08:00–20:00 limits) evaluate against `Asia/Kolkata` using `luxon` before database transactions.
4. **Soft Delete with Owner Notification**: Decommissioned rooms preserve booking history. If active future reservations exist, the admin must confirm cancellation, automatically generating `ROOM_UNAVAILABLE` notifications for all organizers.

### Known Limitations
- Recurring bookings (e.g., "every Monday for 6 months") are intentionally not included in this iteration to preserve deterministic single-booking scheduling clarity.
- Email delivery requires configuring SMTP credentials in `.env`; if absent, the system operates with in-app notification toasts.

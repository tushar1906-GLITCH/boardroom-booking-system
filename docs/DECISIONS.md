# Architecture Decisions Log

This document records architectural and technical decisions made during the design and development of the Meeting Room Booking System.

| # | Decision | One-line Reason |
|---|----------|-----------------|
| 1 | **Local PostgreSQL on Port 5433** | Connect to the local running PostgreSQL 18 instance (already integrated in pgAdmin) without requiring Docker daemon. |
| 2 | **Hand-written SQL Migrations** | Strict adherence to `synchronize: false` in TypeORM ensures schema safety, deterministic indexing, and raw GiST constraint support. |
| 3 | **PostgreSQL GiST Exclusion Constraint for Zero Overlaps** | Database-level mathematical guarantee preventing double-bookings even under extreme concurrency, eliminating race conditions. |
| 4 | **Citext Extension for Case-Insensitive Emails** | Prevents duplicate user registrations with differing casing (e.g. `User@domain.com` vs `user@domain.com`) natively in PostgreSQL. |
| 5 | **HttpOnly Refresh Cookie with Memory Access Tokens** | Protects refresh tokens against XSS theft while enabling seamless silent token rotation through Axios response interceptors. |
| 6 | **Office Timezone Normalization with Luxon** | Ensures business hours (08:00 - 20:00) and 30-minute slot boundaries are calculated reliably across client locales. |
| 7 | **Atomic Reminder Claiming with `SKIP LOCKED`** | Prevents duplicate email/in-app notifications across horizontal instances when scanning upcoming confirmed bookings. |
| 8 | **Soft Deletion for Rooms with Cascading Cancellation Option** | Preserves historical booking records while offering an explicit administrative confirmation flow for future bookings. |
| 9 | **Hex Palette Auto-Assignment for Rooms** | Guarantees consistent visual identity and accessible contrast in calendar and dashboard views without manual color picking. |
| 10 | **FullCalendar with Custom Dark SaaS Styling** | Delivers enterprise-grade multi-view scheduling without external CDN dependencies or generic light-theme styles. |
| 11 | **Zod + React Hook Form Integration** | Guarantees strict type safety and instant inline validation matching backend DTO constraints before network submission. |
| 12 | **Relaxed Booking Window (07:00-22:00, 7 Days)** | Accommodates weekend and evening enterprise bookings without altering validation utility logic. |
| 13 | **Direct Repository Update on Room Reschedule** | Bypasses TypeORM stale relation caching by explicitly issuing `repository.update` followed by reload. |
| 14 | **PostgreSQL 23505 Unique Violation Catch in Rooms Service** | Intercepts lower-case database index collisions on room name to return human-friendly 409 Conflict. |
| 15 | **Isolated Test Database Preparation & Truncate Guard** | Directs E2E test suite to `meeting_room_booking_test_db` with an assertive database name check to protect dev data. |
| 16 | **Portable PGDATA_DIR and Port 5433 Mapping** | Replaces hard-coded filesystem paths with `PGDATA_DIR` and synchronizes Docker host port to 5433. |

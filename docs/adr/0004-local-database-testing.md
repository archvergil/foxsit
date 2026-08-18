# ADR 0004: Two-tier local database testing

Status: accepted — 2026-08-17

Use PGlite for fast embedded and socket-based PostgreSQL tests, and the official Supabase local stack for final integration fidelity.

SQLite was rejected for schema testing because its types, date behavior, constraints, RLS and PostgreSQL syntax differ from the production database. PGlite runs PostgreSQL in WebAssembly without a database installation, applies the production migrations, persists locally when requested and starts fresh in memory for Vitest.

PGlite remains local-only and does not replace Supabase Auth, PostgREST or Storage. ADR 0005 adds a narrow loopback development API for accounts and implemented feature contracts, but passing it alone does not satisfy the Supabase release boundary. The project-scoped Supabase CLI is the fidelity tier once a Docker-compatible runtime is available.

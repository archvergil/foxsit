# ADR 0005: Loopback local backend adapter

Status: accepted — 2026-08-17

Add a development-only HTTP adapter on `127.0.0.1` so the owner can create local accounts and exercise implemented product flows without Docker or a remote Supabase project.

The adapter reuses the persistent PGlite database and production migrations. It provides only contracts the frontend currently consumes and sits behind the same Auth/Profile/Tasks repository interfaces as Supabase. Production builds never select it; local mode requires `VITE_LOCAL_BACKEND_URL` and Vite `development` mode.

SQLite and a broad Supabase imitation were rejected. SQLite would create schema/RLS/date drift, while imitating PostgREST, Storage or email would produce false fidelity. Local credentials use salted scrypt hashes, opaque session tokens are stored only as SHA-256 hashes, the API binds to loopback, and CORS accepts only the known local Vite origins.

The official Supabase local stack remains the release-fidelity boundary.

# ADR 0002: Auth and client boundary

Status: accepted — 2026-08-14

Use Supabase email/password authentication with confirmation and recovery. It gives the personal MVP a conventional durable flow and avoids OAuth scope/configuration. The app resolves persisted session state before protected rendering.

The client is created only when both public environment variables validate. Missing configuration produces a visible non-success state and disabled writes. Authorization is enforced by RLS, starting with own-row profile select/update policies and a protected profile-creation trigger.

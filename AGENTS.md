# AGENTS.md

## Mission

Build and maintain `APP_NAME`, a personal productivity PWA with Today, Calendar, Tasks, Focus/Pomodoro, Habits, Workout and Settings. The product is deployed from GitHub to Cloudflare Pages and uses Supabase Auth, Postgres and Storage.

Read `CODEX_MASTER_PROMPT_PRODUCTIVITY_APP.md` before substantial work. Keep `docs/IMPLEMENTATION_PLAN.md` current.

## Reference project

A legacy project may exist as `archsyrup-main.zip`, `archsyrup-main/` or `.reference/archsyrup-main/`.

Use it only as a source for domain logic, algorithms, tests, SQL ideas, exercise catalog and authorized workout GIF assets. In particular inspect:

- `src/features/habits/`
- `src/features/gym/`
- `src/features/calendar/`
- `src/store/useGymStore.js`
- `public/gym/exercise-catalog.json`
- `scripts/import-workout-exercises.mjs`
- `scripts/import-gym-gifs.mjs`
- `supabase/*.sql`

Do not inherit its design system or copy the whole project. Do not commit its `.env` files, caches, credentials or unrelated modules. Keep `.reference/` outside build, lint and tests.

## Product constraints

- React + TypeScript + Vite.
- React Router.
- Supabase JS.
- TanStack Query for server state.
- Zustand persist only for active workout, active Pomodoro and limited local UI state.
- React Hook Form + Zod.
- date-fns, Lucide, vite-plugin-pwa.
- Vitest/RTL and Playwright.
- Supabase migrations in `supabase/migrations/`.
- RLS on every exposed user table.
- Cloudflare Pages static deployment; output `dist`.
- No service-role key in frontend or `VITE_*` variables.
- No collaboration, payments, AI, social feed, email, finance or notes in the MVP.

## Visual direction

The attached references, not the legacy UI, define the visual target:

- premium native-app feeling;
- excellent mobile, tablet and desktop layouts;
- off-white/soft-gray light theme and charcoal/black dark theme;
- generous but purposeful rounded cards;
- subtle borders and shadows;
- muted mint, coral, blue and sand accents;
- system font stack close to SF Pro;
- capsule bottom navigation on mobile;
- sidebar/rail and bento hierarchy on desktop;
- 44 px minimum touch targets;
- 150–220 ms purposeful motion;
- reduced-motion support.

Avoid generic SaaS dashboards, default shadcn appearance, purple gradients, neon, excessive glassmorphism, emojis as icons and template-like layouts.

## Engineering rules

- TypeScript strict; avoid `any`.
- Keep business rules out of visual components.
- Components must not query Supabase directly; use feature hooks/repositories.
- Use pure tested functions for dates, streaks, timers and workout metrics.
- Do not duplicate remote data in Zustand.
- Use optimistic updates only with rollback and visible error handling.
- Store timed events as `timestamptz`; store local-day concepts such as habit logs and scheduled tasks as `date`.
- Treat timezone explicitly through the profile IANA timezone.
- Preserve active workout and Pomodoro across reload/offline use.
- Never claim a write succeeded before durable persistence.
- Avoid files over roughly 300–400 lines when responsibilities can be separated.
- Do not install a dependency without a clear need.
- Do not modify unrelated files.

## Required checks

Before finishing a meaningful task, run the applicable commands:

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Run focused tests while iterating, then the full relevant suite at phase boundaries.

## Workflow

1. Inspect before editing.
2. Update the implementation plan.
3. Implement a small vertical slice.
4. Add or update tests.
5. Run checks.
6. Update docs when contracts or architecture change.
7. Report what changed, commands run, results, real limitations and the next step.

Do not push without explicit authorization. Commit only when authorized, using small semantic commits.

## Definition of done

A feature is done only when it uses real/local Supabase data, has loading/empty/error/success states, works at 390 px/768 px/1280+ px, supports keyboard and both themes, handles dates correctly, passes tests/typecheck/build, contains no secret or fake action, and visually belongs to the same product.

# Deployment

## Cloudflare Workers Builds

This repository is deployed as a static-asset Worker, not through a Pages-only project. `wrangler.jsonc` declares the `dist` asset directory and the single-page-application fallback, so direct navigation to `/today`, `/tasks` and `/calendar` returns the app shell. Do not add a Pages-style `/* /index.html 200` `_redirects` rule: Workers rejects it as an infinite redirect loop.

In the existing Worker, open **Settings → Builds** and set:

```text
Git branch: main
Root directory: /
Build command: npm run build
Deploy command: npx wrangler deploy
```

Do not set `npx wrangler deploy` as the build command: Workers Builds executes the build command first and the deploy command second. Node `24.18.1` is pinned by the committed `.nvmrc`.

Set these as **Text** values under **Workers & Pages → foxsit → Settings → Build → Build variables and secrets** for the `main` production build:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Use the Project URL and the **Publishable key** from **Supabase → Project Settings → API**. Vite needs these at build time and embeds them in the browser bundle; they are safe only because every exposed table has RLS. Runtime variables under **Settings → Variables and secrets** are not read by this static app and are unnecessary. Do not add `VITE_LOCAL_BACKEND_URL` in Production; it selects the development-only loopback API. Never set a Supabase secret/service-role key, database password, personal access token or SMTP password in Cloudflare build variables.

The Worker URL is shown on the Overview page after the first successful deployment, typically `https://foxsit.<account-subdomain>.workers.dev`. Use that URL for Supabase Auth until a custom domain is attached.

## Supabase

1. In **Project Settings → API**, copy the Project URL and Publishable key into the Cloudflare variables above. Do not copy the `secret`/`service_role` key.
2. In **Authentication → URL Configuration**, set `Site URL` to the final production URL, for example `https://<project>.pages.dev` or the custom domain.
3. Add exact redirect URLs for `https://<production-host>/today` and `https://<production-host>/reset-password`; also retain the equivalent `http://localhost:5173/today` and `http://localhost:5173/reset-password` URLs for local Supabase work. The app calculates both confirmation and recovery redirects from `window.location.origin`.
4. In a local terminal, authenticate the CLI with a Supabase Personal Access Token: `./scripts/npm.cmd exec supabase login`.
5. Link this folder to the hosted project: `./scripts/npm.cmd exec supabase link --project-ref <project-ref>`. The project ref is the subdomain in `https://<project-ref>.supabase.co`; enter the database password only in the CLI prompt, never in this repository.
6. Review the remote migration plan: `./scripts/npm.cmd exec supabase db push --dry-run`.
7. Apply the versioned schema: `./scripts/npm.cmd exec supabase db push`.
8. Generate and review types before a future schema commit: `./scripts/npm.cmd exec supabase gen types typescript --linked --schema public > src/types/database.generated.ts`.
9. Use the publishable/anon key in the browser. RLS remains the authorization boundary.

`supabase db reset --linked` is destructive to the hosted database and must not be used for this production project.

Exercise Storage and the `exercise-gifs` bucket are intentionally deferred until the reference assets and migration rights are available.

## GitHub Actions

The quality workflow runs install, lint, typecheck, unit tests and build on pushes to `main` and all pull requests. Cloudflare Git integration, not GitHub Actions, owns deployment.

## Verification

After the first production deployment:

1. open `/login` and create/sign in to a test account;
2. refresh `/today`, `/tasks`, `/calendar` and `/workout` directly;
3. switch light/dark/system and reload to check for theme flash;
4. test email confirmation and password recovery redirect domains;
5. test installed/standalone display and the service-worker update prompt;
6. create, edit, archive and restore a habit; create/edit/delete a calendar event; then refresh each route and verify the values persist;
7. confirm Supabase logs show no cross-user policy failures from normal own-row operations;
8. use a second test account to confirm it cannot see the first account's Tasks, Calendar, Focus or Habits records.

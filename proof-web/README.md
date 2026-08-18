# PROOF — web app

A focus timer and evidence ledger. React + TypeScript + Vite + Tailwind + Recharts, with optional Supabase for sync.

**Do the work. Keep the evidence.**

---

## Before you start

You need [Node.js](https://nodejs.org) 20 or newer installed. Check with `node --version`.

Supabase is **optional**. Without it, PROOF runs in local mode and stores sessions in the browser — which means you can deploy in about five minutes and add sync later without changing any code.

---

## Part 1 — Run it on your machine first

Always confirm it works locally before deploying. A broken deploy is much harder to diagnose than a broken localhost.

```bash
cd proof-web
npm install
npm run dev
```

Open the address it prints (usually `http://localhost:5173`). You should see the timer. Start a 1-minute session to check the whole loop, then refresh the page mid-session — the countdown should resume exactly where it should be, not restart.

Stop the server with `Ctrl+C`.

---

## Part 2 — Push to GitHub

Netlify deploys from a Git repository. If you don't have `git`, install it from [git-scm.com](https://git-scm.com).

**1. Create an empty repository** at [github.com/new](https://github.com/new). Name it `proof-web`. Don't add a README, `.gitignore`, or licence — the project already has them.

**2. Push the code:**

```bash
cd proof-web
git init
git add .
git commit -m "PROOF: focus timer and evidence ledger"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/proof-web.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. If prompted for a password, GitHub wants a [personal access token](https://github.com/settings/tokens), not your account password.

Confirm `node_modules` did **not** get pushed — the included `.gitignore` prevents it.

---

## Part 3 — Deploy on Netlify

**1.** Go to [app.netlify.com](https://app.netlify.com) and sign in with GitHub.

**2.** Click **Add new site** → **Import an existing project** → **GitHub**.

**3.** Authorise Netlify if asked, then pick your `proof-web` repository.

**4.** Netlify will read `netlify.toml` and fill these in automatically. Confirm they say:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |

**5.** Click **Deploy**.

The first build takes a minute or two. When it finishes you'll get a URL like `https://cheerful-pastry-a1b2c3.netlify.app`. Open it — PROOF is live, running in local mode.

**6.** Rename it if you like: **Site configuration** → **Change site name**.

From now on, every `git push` to `main` triggers an automatic rebuild and deploy.

---

## Part 4 — Add Supabase (optional, for cross-device sync)

Skip this entirely if browser-only storage is fine. Local mode is fully functional — you just can't see the same history on your phone and laptop.

### 4a. Create the project

**1.** Sign up at [supabase.com](https://supabase.com) and click **New project**.

**2.** Give it a name and a database password (save that password somewhere; you won't need it for this app, but you'll want it later). Pick the region closest to you.

**3.** Wait for provisioning — usually a minute or two.

### 4b. Create the table

**1.** In the left sidebar, open **SQL Editor** → **New query**.

**2.** Open `supabase/schema.sql` from this project, copy the entire contents, paste it in, and click **Run**.

This creates the `focus_sessions` table and — importantly — enables Row Level Security with four policies, so every user can only ever read and write their own rows. Don't skip it; without RLS enabled, an anon key would expose everyone's data to everyone.

**3.** Verify: **Table Editor** should now list `focus_sessions`, and it should show a green **RLS enabled** badge.

### 4c. Turn off email confirmation (recommended for a personal app)

By default Supabase emails a confirmation link before a new account can sign in, and its built-in mail service is rate-limited.

Go to **Authentication** → **Sign In / Providers** → **Email**, and turn **Confirm email** off. Now signing up logs you straight in.

If you'd rather keep confirmation on, that's fine — just click the emailed link before your first sign-in.

### 4d. Copy your keys

Go to **Project Settings** → **API** and copy two values:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

The anon key is designed to be public and shipped in browser code. Its safety comes entirely from RLS, which is why step 4b matters. Never put the **service_role** key in this project.

### 4e. Add the keys to Netlify

**1.** In Netlify: **Site configuration** → **Environment variables** → **Add a variable** → **Add a single variable**.

**2.** Add both, exactly as spelled:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

The `VITE_` prefix is required — Vite only exposes variables with that prefix to browser code.

**3.** These are read at **build** time, not run time, so you must rebuild: go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**.

**4.** When it finishes, reload your site. You should now see a sign-in screen instead of the local-mode banner.

### 4f. For local development

Create a file called `.env` in the project root (copy `.env.example`), and put the same two values in it. `.env` is gitignored, so your keys never reach GitHub.

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev` afterwards — Vite reads env files only at startup.

---

## Troubleshooting

**Build fails on Netlify but works locally.** Check the deploy log for the first red error. The usual cause is a file that exists locally but was never committed — run `git status` to spot it.

**Site loads but shows a blank white page.** Open the browser console (F12). If you see a 404 for a `/assets/...` file, the publish directory is wrong — it must be `dist`.

**Still shows "Local mode" after adding keys.** The variables were added but the site wasn't rebuilt. Trigger a fresh deploy with **Clear cache and deploy site**. Also check for typos: `VITE_SUPABASE_ANON_KEY`, not `VITE_SUPABASE_ANNON_KEY`.

**Sign-in says "Invalid login credentials" on a brand-new account.** Email confirmation is still on — click the link in your inbox, or turn confirmation off (step 4c).

**Sessions save but never appear.** RLS is enabled but the policies didn't get created. Re-run `supabase/schema.sql`; it's safe to run again.

**Refreshing a page gives a 404.** The SPA redirect in `netlify.toml` isn't being applied — confirm that file sits in the repository root.

---

## How the timer works

The one piece of engineering that matters. PROOF never decrements a counter and hopes.

When a session starts, `started_at` is written to the database and `expected_end` is derived from it. The display is always `expected_end` minus the current wall clock. Browsers throttle background tabs, laptops sleep, and people refresh — none of that can corrupt the count. If a session's full duration elapsed while the tab was closed, PROOF logs it as completed when you return.

---

## Project structure

```
src/
  components/   ui primitives, chart, heatmap, session table
  pages/        FocusPage, DashboardPage, LoginPage
  hooks/        useFocusSessions - the timer and session lifecycle
  lib/          supabase client, dual-mode store, analytics, formatting
  types.ts      FocusSession and the four statuses
supabase/
  schema.sql    table, indexes, RLS policies
netlify.toml    build settings and SPA redirect
```

Daily totals are always computed from session rows. There is no duplicated summary table to fall out of sync.

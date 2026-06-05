# DrawSpace

Real-time collaborative whiteboard (Next.js + Express + PostgreSQL + Redis).

## Database — Supabase PostgreSQL

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI**
3. Use the **Direct** connection (`db.PROJECT_REF.supabase.co:5432`) or **Session pooler** (port 5432).
4. Do **not** use the **Transaction** pooler (port 6543) for `DATABASE_URL` — migrations need a direct/session connection.
5. If your password has special characters (`@`, `#`, `%`), [URL-encode](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) them.
6. Put the URI in `backend/.env` as `DATABASE_URL`.
7. Apply schema: `cd backend && npm run db:migrate`

SSL is applied automatically for `supabase.co` hosts.

**Connection fails?** Common fixes:

1. **Unpause** the Supabase project (free tier pauses after inactivity).
2. **IPv6 issue** — `db.*.supabase.co` is often IPv6-only. On Windows or IPv4-only networks, use the **Session pooler** URI from Supabase (host `*.pooler.supabase.com`, port `5432`, user `postgres.PROJECT_REF`).
3. **Password encoding** — encode `@`, `#`, `%` in the password (e.g. `@` → `%40`).
4. For pooler + direct split, set `DIRECT_URL` for migrations and `DATABASE_URL` for the running app (see `backend/.env.example`).

## Deploy backend on Render

### Option A — Blueprint

1. Push this repo to GitHub.
2. Render → **New** → **Blueprint** → connect the repo.
3. Set **manual** env vars on **drawspace-api**:
   - `DATABASE_URL` — Supabase connection URI
   - `CLERK_SECRET_KEY` — Clerk dashboard
   - `CLIENT_URL` — frontend URL (e.g. `https://your-app.vercel.app`)
   - `REDIS_URL` — Upstash `rediss://...` URL
4. Deploy. Migrations run on start (`prisma migrate deploy`).
5. Verify: `https://your-api.onrender.com/api/health` → `{ "ok": true, "db": true, "redis": true }`

### Option B — Manual web service

Root directory `backend`, build `npm install && npm run build`, start `npm run db:migrate && npm start`, health `/api/health`.

### Env vars

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL URI |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLIENT_URL` | Yes | Frontend origin for CORS (no trailing slash) |
| `REDIS_URL` | Recommended | Upstash TLS URL (`rediss://...`) |
| `ALLOWED_ORIGINS` | No | Extra CORS origins, comma-separated |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Set by Render |

### Deploy frontend on Vercel

1. Import the GitHub repo → set **Root Directory** to `frontend`.
2. Copy env vars from `frontend/.env.example` into Vercel **Settings → Environment Variables**.
3. Required:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_API_URL` — Render API URL (no trailing slash)
   - `NEXT_PUBLIC_SOCKET_URL` — same as API URL (Socket.io connects directly; Next.js rewrites do not proxy WebSockets)
4. In Clerk → **Domains**, add your Vercel URL (e.g. `https://your-app.vercel.app`).
5. On Render, set `CLIENT_URL` to the Vercel URL and redeploy the backend.
6. Deploy. REST calls use same-origin `/api/*` rewrites; live cursors use `NEXT_PUBLIC_SOCKET_URL`.

Redeploy both services after changing URLs.

### Local development

```bash
# backend
cd backend && cp .env.example .env   # fill in values
npm install && npm run dev

# frontend
cd frontend && npm install && npm run dev
```

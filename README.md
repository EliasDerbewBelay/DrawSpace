# DrawSpace

Real-time collaborative whiteboard (Next.js + Express + PostgreSQL + Redis).

## Deploy backend + Postgres on Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub.
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect the repo.
3. Render reads `render.yaml` and creates:
   - **drawspace-db** (PostgreSQL)
   - **drawspace-api** (Node web service)
4. Set these **manual** env vars on the web service:
   - `CLERK_SECRET_KEY` — from Clerk dashboard
   - `CLIENT_URL` — your deployed frontend URL (e.g. `https://your-app.vercel.app`)
   - `REDIS_URL` — Upstash `rediss://...` URL
5. Deploy. Migrations run automatically on start (`prisma migrate deploy`).
6. Verify: `https://your-api.onrender.com/api/health` → `{ "ok": true, "db": true, "redis": true }`

### Option B — Manual

1. Create **PostgreSQL** on Render → copy **Internal Database URL**.
2. Create **Web Service** → root directory `backend`:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm run db:migrate && npm start`
   - **Health check path:** `/api/health`
3. Add env vars (see `backend/.env.example`).

### Render env vars

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Auto-linked from Render Postgres |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLIENT_URL` | Yes | Frontend origin for CORS (no trailing slash) |
| `REDIS_URL` | Recommended | Upstash TLS URL (`rediss://...`) |
| `ALLOWED_ORIGINS` | No | Extra CORS origins, comma-separated |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Set by Render |

### Frontend (Vercel / etc.)

Point the frontend at your Render API:

```
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-api.onrender.com
```

Redeploy the frontend after changing these.

### Local development

```bash
# backend
cd backend && cp .env.example .env   # fill in values
npm install && npm run dev

# frontend
cd frontend && npm install && npm run dev
```

# Deploying BIS Sahayak

**Live (Vercel):** https://bis-sahayak-eight.vercel.app

Two deployment targets have been set up:

| Target | Status | Notes |
|---|---|---|
| **Vercel** (primary) | ✅ deployed — 3 services in one project + Neon Postgres (pgvector) | see below |
| Railway | ⚠️ abandoned mid-provision | free plan's account-wide resource limit blocked the second service; project `bis-sahayak` (postgres + volume) still exists — delete it in the Railway dashboard if you won't use it |

---

## Vercel (current setup)

### Architecture

One Vercel project (`bis-sahayak`) with three **services** (Vercel Services, `vercel.json`):

| Service | Root | Framework | Notes |
|---|---|---|---|
| `web` | `frontend/` | vite | SPA; catch-all rewrite to `/index.html` |
| `api` | `node-api/` | express | builds via `npm run build` (tsc → `dist/`); the handler is **`dist/app.js`, which must default-export the app** (that's the express preset's convention) |
| `ai` | `ai-service/` | fastapi | entrypoint `app.main:app`; routes mounted at root *and* under `/api/ai` |

Routing (top-level rewrites in `vercel.json`):
- `/api/v1/*` → `api` service — the service sees the **original path**, which is why `createApp` mounts routes at `/api/v1`.
- `/api/ai/*` → `ai` service (convenience for direct checks; the app itself is also fine internal-only).
- everything else → `web`.

`api` → `ai` communication uses a **service binding** (`vercel.json` → `bindings`), which injects the deployment-aware base URL as `AI_SERVICE_URL` — the same env var the Docker/local setup uses.

Database: **Vercel Postgres (Neon)** connected to the project; it injects `DATABASE_URL` automatically. Neon supports `pgvector`, so the same schema works.

Environment variables: `DATABASE_URL` (from Neon) and `JWT_SECRET` (set once via `vercel env add JWT_SECRET production`).

### One-time data bootstrap (already done, repeatable)

```bash
vercel env pull .env.vercel --environment production
# then, with DATABASE_URL read from .env.vercel:
cd ingestion
python init_db.py && python seed_standards.py && python seed_qco.py \
  && python seed_verification.py && python embed_corpus.py
cd .. && DATABASE_URL=<from .env.vercel> node node-api/scripts/seed-demo.mjs
```

### Redeploying

```bash
vercel --prod          # CLI deploy (uploads local files)
```

For git-push deploys, connect the repo in the dashboard: Vercel project → Settings → Git → connect `aayush0778/bis-sahayak`.

Demo accounts on production: `business@demo.bis` / `consumer@demo.bis`, password `Sahayak@123`.

End-to-end check against production:

```bash
API_URL=https://bis-sahayak-eight.vercel.app/api/v1 node scripts/verify-api.mjs
```

---

## Railway (appendix — what happened)

Railway was attempted first: project `bis-sahayak` was created with a `pgvector/pgvector:pg16` Postgres + volume, but provisioning the remaining services failed with *"Free plan resource provision limit exceeded"* (the limit is account-wide and the old `talweg` project also consumes it). The deployment moved to Vercel instead.

To clean up the unused Railway resources: Railway dashboard → project `bis-sahayak` → delete, or `railway project delete` (CLI is logged in). Nothing else references it.

<details>
<summary>The full 4-service Railway layout (if you ever upgrade the plan)</summary>

| Railway service | Source | Root dir | Variables |
|---|---|---|---|
| `postgres` | Docker image `ghcr.io/pgvector/pgvector:pg16` | — | `POSTGRES_USER=bis`, `POSTGRES_PASSWORD=…`, `POSTGRES_DB=bis`, volume at `/var/lib/postgresql/data` |
| `ai` | Dockerfile | `ai-service` | `DATABASE_URL=postgresql://bis:…@postgres.railway.internal:5432/bis`, `EMBEDDING_BACKEND=hash`, `PORT=8000` |
| `node-api` | Dockerfile | `node-api` | `DATABASE_URL=…`, `AI_SERVICE_URL=http://ai.railway.internal:8000`, `JWT_SECRET=…`, `PORT=4000` |
| `frontend` | Dockerfile | `frontend` | `API_UPSTREAM=node-api.railway.internal:4000`, generate a public domain |

Each service directory already carries a `railway.json` (Dockerfile builder + `/health` health check). Data bootstrap: enable a TCP proxy on `postgres`, then run the same seed commands from a laptop with `DATABASE_URL` pointing at the proxy.
</details>

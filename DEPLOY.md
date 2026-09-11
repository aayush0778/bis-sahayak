# Deploying BIS Sahayak

Two targets: **GitHub** (source) and **Railway** (hosting all four services).

## 0. What runs where on Railway

| Railway service | Build | Root directory | Notes |
|---|---|---|---|
| `postgres` | Docker image `ghcr.io/pgvector/pgvector:pg16` | — | needs a volume + POSTGRES_* variables |
| `ai` | Dockerfile (repo root `ai-service/`, has `railway.json`) | `ai-service` | private only — no public domain needed |
| `node-api` | Dockerfile (`node-api/`) | `node-api` | private; public domain optional (health checks via UI) |
| `frontend` | Dockerfile (`frontend/`) | `frontend` | public domain; nginx proxies `/api` over Railway's private network |

All three app images read `railway.json` from their root directory (Dockerfile builder + `/health` health checks).

## 1. GitHub

Already done in this workspace (see bottom). To re-push after changes:

```bash
git add -A && git commit -m "..." && git push
```

## 2. Railway (dashboard flow — most reliable)

1. **New project → Deploy from GitHub repo** → pick `aayush0778/bis-sahayak`.
   Railway will try to create one service; we need four. Start by keeping the auto-detected service for reference or delete it, then:
2. **Create `postgres`**: New → **Docker Image** → `ghcr.io/pgvector/pgvector:pg16`.
   - Variables: `POSTGRES_USER=bis`, `POSTGRES_PASSWORD=<generate-a-strong-one>`, `POSTGRES_DB=bis`
   - Settings → Volumes → attach at `/var/lib/postgresql/data`
   - No public domain needed (everything talks over private networking).
3. **Create `ai`**: New → GitHub Repo → Settings → Root Directory = `/ai-service` (it will use `railway.json`).
   - Variables:
     ```
     DATABASE_URL=postgresql://bis:<password>@postgres.railway.internal:5432/bis
     EMBEDDING_BACKEND=hash
     PORT=8000
     ```
   - Settings → Networking → **do not** generate a public domain (keep it private).
4. **Create `node-api`**: Root Directory = `/node-api`.
   - Variables:
     ```
     DATABASE_URL=postgresql://bis:<password>@postgres.railway.internal:5432/bis
     AI_SERVICE_URL=http://ai.railway.internal:8000
     JWT_SECRET=<generate-a-long-random-string>
     PORT=4000
     ```
5. **Create `frontend`**: Root Directory = `/frontend`.
   - Variable: `API_UPSTREAM=node-api.railway.internal:4000`
   - Settings → Networking → **Generate Domain** (this is the URL you demo from).
6. Wait for all deploys to go green. `frontend` → open the domain → landing page loads; `/api/v1/qco/feed` returns JSON through the nginx proxy.

## 3. One-time data bootstrap

The schema auto-applies on first `docker-entrypoint-initdb.d` run **only for local compose** (the init SQL is mounted there). On Railway the empty `postgres` volume needs the schema + seeds pushed once from your machine:

1. `postgres` service → Settings → Networking → **TCP Proxy → Generate** (gives you `<host>:<port>`).
2. From the repo root:
   ```bash
   export DATABASE_URL=postgresql://bis:<password>@<tcp-proxy-host>:<proxy-port>/bis
   npm run db:init && npm run db:seed && npm run db:embed && npm run demo:users
   ```
3. Remove the TCP proxy afterwards (optional hygiene).

Done. Sign in on the deployed frontend with `business@demo.bis` / `Sahayak@123`.

## 4. Railway CLI alternative

```bash
npm i -g @railway/cli
railway login
railway init --name bis-sahayak
# create postgres + volume in the dashboard (CLI flag surface varies by version), then:
railway add --service ai          # then link: railway service ai
railway variables --set "DATABASE_URL=postgresql://bis:<pw>@postgres.railway.internal:5432/bis" --set "EMBEDDING_BACKEND=hash" --set "PORT=8000"
railway up --path ai-service
railway add --service node-api
railway variables --set "DATABASE_URL=postgresql://bis:<pw>@postgres.railway.internal:5432/bis" --set "AI_SERVICE_URL=http://ai.railway.internal:8000" --set "JWT_SECRET=<secret>" --set "PORT=4000"
railway up --path node-api
railway add --service frontend
railway variables --set "API_UPSTREAM=node-api.railway.internal:4000"
railway up --path frontend
railway domain                    # public domain for the linked (frontend) service
```
(If your CLI version flags differ, `railway add --help` / `railway variables --help` show the current syntax — the dashboard flow above is the stable path.)

## Notes

- **CORS is already open** on node-api; if you point the frontend at a public API domain instead of the nginx proxy, nothing extra is needed.
- **Costs**: 4 services + 1 volume fits inside Railway's trial/hobby credit for a hackathon demo; scale down `postgres` when idle.
- The **hash embedding backend** and **extractive synthesizer** mean the deployed demo needs **zero external API keys**. To upgrade answer quality later: set `LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL` on the `ai` service and (optionally) `EMBEDDING_BACKEND=minilm` + rebuild + re-run the embed step.
- Private DNS names (`postgres.railway.internal`, `ai.railway.internal`, `node-api.railway.internal`) are derived from the service names shown in the table above — if you rename a service, update the referencing variables.

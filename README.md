# BIS Sahayak — AI-powered Intelligent Assistant for Indian Standards & BIS Services

**SIH26107** · Ministry of Consumer Affairs, Food & Public Distribution · Theme: Smart Automation

> ☁️ **Deploying?** See [DEPLOY.md](DEPLOY.md) for the full GitHub + Railway walkthrough (all four services, including pgvector Postgres, private networking, and the one-time data bootstrap).

BIS Sahayak closes the loop no existing BIS channel closes: **product → applicable standards → mandatory or voluntary → which scheme → what changed recently → next step**, in natural language, with citations, for both an MSME founder and a routine consumer.

## Architecture

```
React 19 + Vite + TS + Tailwind  →  Node/Express/TS orchestration API  →  Python FastAPI AI service
        (frontend/)                       (node-api/)                        (ai-service/)
                                                                                 │
                                     PostgreSQL 16 + pgvector  ←─────────────────┘
                                          (db/init.sql, seeded by ingestion/)
```

- **Node API (`:4000`)** — auth (JWT/bcrypt), chat persistence, verification lookups, watches, QCO feed, complaints; proxies AI calls.
- **AI service (`:8000`, loopback-only by design)** — pgvector retrieval, citation-grounded synthesis, applicability engine, complaint drafting.
- **Postgres (`:5432`)** — single instance, pgvector for embeddings. Docker image `pgvector/pgvector:pg16`.

## Run it locally (three commands, zero API keys)

```bash
# 0) prerequisites: Node 20+, Python 3.12+, Docker
docker compose up -d postgres        # Postgres + pgvector (schema auto-applies from db/init.sql)
npm run setup                        # installs node-api, frontend, root, and Python deps

# 1) seed the corpus (89 real standards, 14 real QCOs, 24 sample verification records) + embeddings
npm run db:seed && npm run db:embed

# 2) demo accounts with pre-populated watches
npm run demo:users

# 3) start AI service + Node API + frontend (concurrently)
npm run dev
```

Then open **http://localhost:5173**.

Demo accounts (password `Sahayak@123`):

| Account | Role | Pre-seeded |
|---|---|---|
| `business@demo.bis` | business | 3 watched categories |
| `consumer@demo.bis` | consumer | — |

### Fully dockerized

```bash
docker compose up -d postgres          # wait for healthy
npm run db:seed && npm run db:embed && npm run demo:users   # from the host against localhost:5432
docker compose up -d ai api frontend   # frontend on http://localhost:8080 (nginx proxies /api)
```

## The five MVP features

1. **RAG chat** (`/chat`) — answers only from the seeded corpus; every claim carries a clickable citation chip back to the official source.
2. **Applicability wizard** (`/applicability`) — free-text product description → ranked IS standards + scheme + **mandatory flag derived from actual QCO coverage in SQL/Python, never from an LLM**.
3. **Mark verification** (`/verify`) — CM/L, HUID, CRS lookup over *sample* records styled on BIS Care fields (live licence DB is access-gated — stated openly, on the result card and in the pitch).
4. **Regulatory Change Radar** (`/radar`) — chronological QCO feed with category filters, "affects your watches" badges, and year chart; watches drive the business dashboard.
5. **Complaint Copilot** (`/complaints`) — free text → structured, editable complaint draft (with licence-number regex extraction) → submit.

## The hallucination guardrail (the demo-critical behaviour)

`ai-service/app/retrieval.py` implements a **two-factor grounding gate**. If either fails, the assistant refuses honestly ("I don't have a standard or QCO on file…") instead of improvising:

1. top-1 cosine similarity ≥ `GROUNDING_THRESHOLD` (0.30), **and**
2. ≥ `MIN_CONTENT_OVERLAP` (25%) of the query's content words literally appear in the top chunk.

Calibration on the seeded corpus (16 real queries vs off-corpus probes): real queries score ≥ 0.355 similarity; off-corpus queries ≤ 0.254 similarity *and* ~0 lexical coverage. Try it live: ask chat *"unicorn saddle certification on Mars"*.

## Embeddings & LLM — swappable by design

- **Embeddings**: `EMBEDDING_BACKEND=hash` (default; deterministic stdlib token/stem hashing, 384-dim, offline) | `minilm` (`pip install sentence-transformers`, all-MiniLM-L6-v2) | `api` (any OpenAI-compatible `/embeddings`). Vectors are keyed by model name in the DB — switching backends just means re-running `npm run db:embed`.
- **LLM synthesis**: with `LLM_API_KEY` unset, a deterministic **extractive synthesizer** composes the answer purely from retrieved, cited chunks (offline demo, zero hallucination surface). Set an OpenAI-compatible key/base/model to upgrade phrasing; retrieval, citations and contracts don't change.

## Data provenance (the Section-6 slide, in repo form)

| Table | Rows | Source |
|---|---|---|
| `standards` | 89 curated (prioritised to overlap the QCO corpus) | BIS "Know Your Standards" catalogue, services.bis.gov.in (each row carries `source_url`) |
| `qco_notifications` | 14 real, named orders (2026 Electrical Appliances S.O. 1739(E), 2026 Aluminium S.O. 1319(E), Transition Facilitation 2026, Toys QCO 2020, Domestic Pressure Cooker QCO 2020, CRS 2012, Cement QCO 2003, Steel QCO 2012, AC QCOs, …) | Gazette PDFs / DPIIT notices via the documented tracker links in `ingestion/data/qco_notifications.json` |
| `verification_records` | 24 **sample** records | Styled on BIS Care lookup fields; live licence DB deliberately out of hackathon scope (access-gated, not non-existent) |

Schema deviations from spec Section 10 (all documented in `db/init.sql`): `standards.aliases` (synonyms that materially improve retrieval), `embeddings.model` (safe backend swaps), `complaints.draft` (persisted LLM draft).

## Tests

```bash
npm test    # Node (Vitest, 23) + frontend (Vitest, 8) + Python (Pytest, 25) — 56 tests, no live services needed
npm run verify:api   # 22-check end-to-end suite against running services
```

## Repo layout

```
db/init.sql            schema (pgvector; three documented additions)
ingestion/             init_db, seed_standards, seed_qco, seed_verification, embed_corpus + data/*.json
ai-service/            FastAPI: embeddings, chunking, retrieval+gate, applicability engine, LLM layer, RAG routes
node-api/              Express: auth, chat, applicability proxy, verify, qco feed, watches, complaints
frontend/              React: landing, auth, chat (citation chips), wizard, radar, verify, complaints, dashboards
scripts/verify-api.mjs end-to-end verification (22 checks)
```

# One-shot data bootstrap image (schema + seeds + embeddings + demo users).
# Deployed with the root railway.json config; runs once and exits.
FROM python:3.12-slim
WORKDIR /srv
RUN pip install --no-cache-dir "psycopg[binary]>=3.2" bcrypt>=4.2
COPY ingestion/common.py ingestion/init_db.py ingestion/seed_standards.py \
     ingestion/seed_qco.py ingestion/seed_verification.py ingestion/embed_corpus.py \
     ingestion/seed_demo_users.py ./
COPY ingestion/data ./data
COPY db/init.sql ./db-init.sql
# embed_corpus imports the embedding/chunking code from the ai-service package
# (stdlib-only modules — FastAPI is not needed here).
COPY ai-service/app ./ai-service/app

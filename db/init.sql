-- BIS Sahayak database schema (PostgreSQL 16 + pgvector)
-- Based on SIH26107 spec Section 10, with three documented additions:
--   * standards.aliases          — synonym list that materially improves retrieval
--                                  ("geyser" -> IS 302 (Part 2/Sec 21), etc.)
--   * embeddings.model           — records which embedding backend produced the vector,
--                                  so switching models cannot silently mix vector spaces
--   * complaints.draft           — structured LLM-drafted complaint text kept with the row

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consumer', 'business', 'admin')),
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS standards (
  is_number TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "group" TEXT,
  sub_group TEXT,
  sub_sub_group TEXT,
  certification_scheme TEXT,
  superseding_is TEXT,
  superseded_is TEXT,
  cross_referenced_is TEXT[],
  aliases TEXT[],
  technical_committee TEXT,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qco_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  product_categories TEXT[] NOT NULL,
  applicable_is_numbers TEXT[] NOT NULL,
  effective_date DATE NOT NULL,
  issuing_authority TEXT NOT NULL,
  scheme TEXT,
  summary TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('standard', 'qco')),
  source_id TEXT NOT NULL,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  model TEXT NOT NULL,
  embedding VECTOR(384) -- matches the configured embedding dimension
);
CREATE UNIQUE INDEX IF NOT EXISTS embeddings_source_chunk ON embeddings (model, source_type, source_id, chunk_index);
-- NOTE: no ivfflat index here on purpose — ivfflat must be built on a populated table
-- (building it empty leaves most lists empty and approximate search can miss rows).
-- At demo scale (~120 chunks) Postgres does an exact sequential scan, which is both
-- fast and complete. Re-add `CREATE INDEX ... USING ivfflat` after a full ingestion:
--   CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_category)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB, -- [{ "type": "standard", "ref": "IS 302 (Part 1):2024", "source_url": "..." }, ...]
  grounded BOOLEAN DEFAULT TRUE,
  synthesis TEXT, -- 'llm' | 'corpus' (v2: synthesis-source transparency)
  fell_back BOOLEAN DEFAULT FALSE, -- v2: true when the LLM failed and the extractive composer took over
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_session ON chat_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS verification_records ( -- seeded sample data (see spec Section 6)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL CHECK (record_type IN ('CM/L', 'HUID', 'CRS')),
  record_number TEXT UNIQUE NOT NULL,
  holder_name TEXT NOT NULL,
  product_scope TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')),
  valid_until DATE
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_description TEXT NOT NULL,
  defect_description TEXT NOT NULL,
  related_record_number TEXT,
  draft JSONB,
  cpgrams_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- v2: BIS physical footprint (HQ, regional offices, branch offices, laboratories).
-- Every row carries the official source URL it was transcribed from.
CREATE TABLE IF NOT EXISTS bis_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_type TEXT NOT NULL CHECK (office_type IN ('hq', 'regional_office', 'branch_office', 'laboratory')),
  name TEXT NOT NULL,
  region TEXT,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocode_precision TEXT,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name)
);

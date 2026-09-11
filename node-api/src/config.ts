import "dotenv/config";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: envInt("PORT", 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://bis:bis@localhost:5432/bis",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  aiTimeoutMs: envInt("AI_TIMEOUT_MS", 45000),
};

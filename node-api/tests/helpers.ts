import type { QueryResult } from "pg";

export type SqlHandler = (sql: string, params?: unknown[]) => { rows: unknown[]; rowCount?: number } | undefined;

/**
 * Minimal fake pg pool: route by regex on the SQL text. Keeps API tests honest
 * about the SQL they issue without needing a live database.
 */
export function fakeDb(handlers: [RegExp, SqlHandler][]) {
  return {
    query: async <T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params?: unknown[],
    ): Promise<QueryResult<T>> => {
      for (const [pattern, handler] of handlers) {
        if (pattern.test(text)) {
          const result = handler(text, params);
          if (result) {
            return { rows: result.rows as T[], rowCount: result.rowCount ?? result.rows.length, command: "", oid: 0, fields: [] };
          }
        }
      }
      throw new Error(`fakeDb: no handler for SQL: ${text.slice(0, 80)}`);
    },
  };
}

export function stubAi(responses: Record<string, unknown>) {
  const calls: { path: string; body: unknown }[] = [];
  return {
    calls,
    post: async <T>(path: string, body: unknown): Promise<T> => {
      calls.push({ path, body });
      for (const [key, value] of Object.entries(responses)) {
        if (path.startsWith(key)) return value as T;
      }
      throw new Error(`stubAi: no response configured for ${path}`);
    },
  };
}

export const TEST_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "maker@example.com",
  role: "business" as const,
};

import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { config } from "./config";

export type DB = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

export const pool: DB = new Pool({ connectionString: config.databaseUrl });

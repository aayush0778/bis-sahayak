/**
 * Default application instance.
 *
 * This file compiles to `dist/app.js`, which is exactly what the Vercel
 * Services "express" framework preset expects to find and load as the
 * function handler (it must default-export the app).
 *
 * Locally, `src/index.ts` imports this instance and calls app.listen().
 */
import { createApp } from "./createApp";
import { pool } from "./db";
import { ai } from "./aiClient";

const app = createApp({ db: pool, ai });

export default app;

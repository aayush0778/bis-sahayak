import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db";
import { ai, AiServiceError } from "./aiClient";

const app = createApp({ db: pool, ai });

app.listen(config.port, () => {
  console.log(`[bis-sahayak] node-api listening on http://localhost:${config.port}`);
  console.log(`[bis-sahayak] ai-service: ${config.aiServiceUrl} | db: ${config.databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
});

process.on("unhandledRejection", (reason) => {
  if (reason instanceof AiServiceError) {
    console.error(`[bis-sahayak] AI service issue: ${reason.message}`);
    return;
  }
  console.error("[bis-sahayak] unhandled rejection:", reason);
});

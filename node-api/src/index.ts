import app from "./app";
import { config } from "./config";
import { AiServiceError } from "./aiClient";

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

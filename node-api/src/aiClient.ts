import { config } from "./config";

export class AiServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export interface AIClient {
  post<T = unknown>(path: string, body: unknown): Promise<T>;
}

/** Thin HTTP client for the Python AI service (internal, loopback by default). */
export function httpAIClient(baseUrl = config.aiServiceUrl): AIClient {
  return {
    async post<T>(path: string, body: unknown): Promise<T> {
      let response: Response;
      try {
        response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(config.aiTimeoutMs),
        });
      } catch (cause) {
        throw new AiServiceError(`AI service unreachable at ${baseUrl}`, 502);
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AiServiceError(
          `AI service error (${response.status}): ${detail.slice(0, 300)}`,
          response.status >= 500 ? 502 : response.status,
        );
      }
      return (await response.json()) as T;
    },
  };
}

export const ai = httpAIClient();

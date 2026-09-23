import type { AppConfig } from "../config.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class HttpClient {
  constructor(private readonly config: AppConfig) {}

  async getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const res = await this.request(url, { Accept: "application/json", ...headers });
    return (await res.json()) as T;
  }

  async getText(url: string, headers: Record<string, string> = {}): Promise<string> {
    const res = await this.request(url, { Accept: "text/plain, */*", ...headers });
    return res.text();
  }

  private async request(url: string, headers: Record<string, string>): Promise<Response> {
    let lastError: unknown;
    const attempts = this.config.HTTP_RETRIES + 1;
    for (let i = 0; i < attempts; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.HTTP_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        if (res.status === 429 || res.status >= 500) {
          lastError = new HttpError(res.status, url, `HTTP ${res.status}`);
          await this.backoff(i);
          continue;
        }
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new HttpError(res.status, url, body.slice(0, 240) || `HTTP ${res.status}`);
        }
        return res;
      } catch (err) {
        lastError = err;
        if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err;
        if (i < attempts - 1) await this.backoff(i);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private backoff(attempt: number): Promise<void> {
    const ms = Math.min(2000, 250 * 2 ** attempt);
    return new Promise((r) => setTimeout(r, ms));
  }
}

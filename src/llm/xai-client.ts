import { LLM_JSON_SCHEMA } from "./schema.js";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmClient {
  complete(messages: ChatMessage[]): Promise<string>;
}

export interface XaiClientOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

export class XaiStructuredClient implements LlmClient {
  constructor(private readonly opts: XaiClientOptions) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs);
    try {
      const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.opts.model,
          temperature: 0.2,
          messages,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "institutional_research_note",
              strict: true,
              schema: LLM_JSON_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`xAI HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("xAI returned empty content");
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

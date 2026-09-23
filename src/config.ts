import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  EODHD_API_TOKEN: z.string().optional().default(""),
  FMP_API_KEY: z.string().optional().default(""),
  OPENBB_BASE_URL: z.string().optional().default(""),
  OPENBB_API_KEY: z.string().optional().default(""),
  REDIS_URL: z.string().optional().default(""),
  CACHE_TTL_QUOTE_SECONDS: z.coerce.number().int().positive().default(60),
  CACHE_TTL_FUNDAMENTALS_SECONDS: z.coerce.number().int().positive().default(43_200),
  CACHE_TTL_CRYPTO_SECONDS: z.coerce.number().int().positive().default(120),
  CACHE_TTL_MACRO_SECONDS: z.coerce.number().int().positive().default(300),
  ENABLE_DEMO_FIXTURES: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false" && v !== "0"),
  ENABLE_LIVE_QUOTES: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false" && v !== "0"),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(12_000),
  HTTP_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  XAI_API_KEY: z.string().optional().default(""),
  XAI_MODEL: z.string().optional().default("grok-4.6"),
  XAI_BASE_URL: z.string().optional().default("https://api.x.ai/v1"),
  XAI_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return schema.parse(env);
}

import pino from "pino";
import type { AppConfig } from "./config.js";

export function createLogger(config: AppConfig) {
  const pretty = config.NODE_ENV !== "production";
  return pino({
    level: config.LOG_LEVEL,
    transport: pretty
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined,
    base: { service: "invest-platform" },
  });
}

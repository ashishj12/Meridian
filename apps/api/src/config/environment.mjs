import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_PATH: z.string().min(1).default("data/meridian.sqlite"),
  FLIGHT_SOURCE: z.enum(["mock-aidx", "vendor-api"]).default("mock-aidx"),
  AI_PROVIDER: z
    .enum(["offline-template", "vendor-api"])
    .default("offline-template"),
  CREATIVE_SECOND_LANGUAGE: z.enum(["hi", "ar", "fr"]).default("hi"),
  AI_SCORER: z.enum(["offline-heuristic", "llm"]).default("offline-heuristic"),
  PUBLIC_BASE_URL: z.union([z.literal(""), z.url()]).default(""),
  VENDOR_SNAPSHOT_URL: z.url().optional(),
  VENDOR_EVENTS_URL: z.url().optional(),
  AI_ENDPOINT: z.url().optional(),
  AI_SCORER_ENDPOINT: z.url().optional(),
});
/** Reject invalid deployment configuration before accepting requests. Secrets stay in environment variables. */
export function readConfiguration(environment = process.env) {
  const config = schema.parse(environment);
  if (config.FLIGHT_SOURCE === "vendor-api" && !config.VENDOR_SNAPSHOT_URL)
    throw new Error("VENDOR_SNAPSHOT_URL is required for vendor-api");
  if (config.AI_PROVIDER === "vendor-api" && !config.AI_ENDPOINT)
    throw new Error("AI_ENDPOINT is required for vendor-api");
  if (config.AI_SCORER === "llm" && !config.AI_SCORER_ENDPOINT)
    throw new Error("AI_SCORER_ENDPOINT is required for llm");
  return config;
}

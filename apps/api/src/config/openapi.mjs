import { z } from "zod";

export function createSpecification(routes, campaignSchema) {
  const paths = {};
  for (const [method, url] of routes) {
    if (!url.startsWith("/api/")) continue;
    const normalized = url.replace(/:([\w]+)/g, "{$1}");
    paths[normalized] ??= {};
    const parameters = [...url.matchAll(/:([\w]+)/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    }));
    const operation = {
      operationId: method + "_" + url.replace(/[^a-z0-9]/gi, "_"),
      summary: method.toUpperCase() + " " + url,
      parameters,
      responses: {
        200: { description: "Success" },
        400: { description: "Validation failure" },
        404: { description: "Not found" },
        409: { description: "State conflict" },
        429: { description: "Rate limit" },
      },
    };
    if (["post", "patch"].includes(method))
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: schemas[url] || {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      };
    if (method === "post" && url === "/api/campaigns")
      operation.requestBody.content["application/json"].schema = {
        $ref: "#/components/schemas/CampaignInput",
      };
    paths[normalized][method] = operation;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "MERIDIAN Airport Retail Intelligence API",
      version: "1.0.0",
      description:
        "Synthetic no-auth playground. JSON errors contain an error string. Times use ISO UTC or epoch milliseconds. SSE events contain type, sequence and simulation time.",
    },
    servers: [{ url: "/" }],
    paths,
    components: {
      schemas: {
        CampaignInput: z.toJSONSchema(campaignSchema),
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
      },
    },
  };
}
const schemas = {
  "/api/simulation/control": {
    type: "object",
    properties: {
      action: { enum: ["play", "pause", "reset", "speed", "jump"] },
      speed: { enum: [1, 10, 60] },
      time: { type: "string", format: "date-time" },
    },
  },
  "/api/simulation/events": {
    type: "object",
    required: ["type"],
    properties: {
      type: {
        enum: [
          "delay",
          "gate-change",
          "screen-offline",
          "boarding",
          "departure",
          "arrival",
          "cancellation",
          "evidence",
          "feed-lag",
          "creative-failure",
        ],
      },
      flightId: { type: "string" },
      screenId: { type: "string" },
      minutes: { type: "number", minimum: 0, maximum: 1440 },
      gate: { type: "string" },
      id: { type: "string" },
      mode: {
        enum: ["fresh", "stale", "missing", "contradictory", "unverifiable"],
      },
    },
  },
  "/api/inventory/book": {
    type: "object",
    required: ["screenId", "campaignId", "timestamp"],
    properties: {
      screenId: { type: "string" },
      campaignId: { type: "string" },
      timestamp: {
        type: "integer",
        description: "UTC epoch milliseconds aligned to an hour",
      },
    },
  },
  "/api/creatives/generate": {
    type: "object",
    required: ["brief"],
    properties: { brief: { type: "string", minLength: 5, maxLength: 1000 } },
  },
  "/api/feeds/aidx": {
    type: "object",
    required: ["xml"],
    properties: {
      xml: {
        type: "string",
        description: "Illustrative AIDX XML; DTD and entities forbidden",
      },
    },
  },
};

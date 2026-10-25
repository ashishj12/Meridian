import { z } from "zod";

const object = (properties, required = []) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
});

const schemas = {
  Error: object({ error: { type: "string" } }, ["error"]),
  Entity: object({
    id: { type: "string" },
    name: { type: "string" },
    type: { type: "string" },
  }),
  EntityList: { type: "array", items: { $ref: "#/components/schemas/Entity" } },
  EntityInput: {
    ...object({
      id: { type: "string", maxLength: 80 },
      name: { type: "string", minLength: 1, maxLength: 160 },
      zoneId: { type: "string" },
      terminal: { type: "string" },
      status: {
        type: "string",
        enum: [
          "online",
          "degraded",
          "offline",
          "open",
          "investigating",
          "resolved",
        ],
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
      },
      start: { type: "string", format: "date-time" },
      end: { type: "string", format: "date-time" },
      screenIds: { type: "array", items: { type: "string" } },
      zoneIds: { type: "array", items: { type: "string" } },
      image: { type: "string", pattern: "^data:image/(png|jpeg|webp);base64," },
      orientation: { type: "string", enum: ["portrait", "landscape"] },
      size: { type: "number", exclusiveMinimum: 0 },
      nearestGates: { type: "array", items: { type: "string" } },
      owner: { type: "string", minLength: 1 },
    }),
    additionalProperties: true,
  },
  Flight: object({
    id: { type: "string" },
    number: { type: "string" },
    airlineId: { type: "string" },
    origin: { type: "string" },
    destination: { type: "string" },
    direction: { type: "string", enum: ["A", "D"] },
    international: { type: "boolean" },
    terminal: { type: "string" },
    gate: { type: "string" },
    scheduled: { type: "string", format: "date-time" },
    estimated: { type: "string", format: "date-time" },
    status: { type: "string" },
    seats: { type: "integer", minimum: 0 },
    pax: { type: "integer", minimum: 0 },
    delay: { type: "integer", minimum: 0 },
  }),
  FlightPage: object(
    {
      total: { type: "integer", minimum: 0 },
      items: { type: "array", items: { $ref: "#/components/schemas/Flight" } },
    },
    ["total", "items"],
  ),
  Campaign: object({
    id: { type: "string" },
    name: { type: "string" },
    outletId: { type: "string" },
    headline: { type: "string" },
    offer: { type: "string" },
    zoneIds: { type: "array", items: { type: "string" } },
    budget: { type: "number" },
    status: { type: "string", enum: ["pending", "approved", "rejected"] },
    creativeApproved: { type: "boolean" },
    paused: { type: "boolean" },
  }),
  CampaignList: {
    type: "array",
    items: { $ref: "#/components/schemas/Campaign" },
  },
  Screen: object({
    id: { type: "string" },
    name: { type: "string" },
    zoneId: { type: "string" },
    terminal: { type: "string" },
    status: { type: "string", enum: ["online", "degraded", "offline"] },
    orientation: { type: "string", enum: ["portrait", "landscape"] },
    nearestGates: { type: "array", items: { type: "string" } },
  }),
  Decision: object({
    id: { type: "string" },
    screenId: { type: "string" },
    campaignId: { type: "string" },
    score: { type: "number" },
    rationale: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    evidence: { type: "array", items: { type: "object" } },
  }),
  DecisionList: {
    type: "array",
    items: { $ref: "#/components/schemas/Decision" },
  },
  Clock: object({
    time: { type: "string", format: "date-time" },
    speed: { type: "integer", enum: [1, 10, 60] },
    paused: { type: "boolean" },
    sequence: { type: "integer", minimum: 0 },
  }),
  SimulationEvent: object(
    {
      id: { type: "string" },
      type: {
        type: "string",
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
      campaignId: { type: "string" },
      minutes: { type: "number", minimum: 0, maximum: 1440 },
      gate: { type: "string" },
      mode: {
        type: "string",
        enum: ["fresh", "stale", "missing", "contradictory", "unverifiable"],
      },
    },
    ["type"],
  ),
  BookingInput: object(
    {
      screenId: { type: "string" },
      campaignId: { type: "string" },
      timestamp: {
        type: "integer",
        minimum: 1,
        description: "UTC epoch milliseconds aligned to an hour",
      },
    },
    ["screenId", "campaignId", "timestamp"],
  ),
  Booking: object({
    id: { type: "string", format: "uuid" },
    screenId: { type: "string" },
    campaignId: { type: "string" },
    timestamp: { type: "integer" },
    price: { type: "number" },
  }),
  PromotionAction: object({ issue: { type: "boolean", default: false } }),
};

const zodSchemas = {
  "/api/campaigns": z.toJSONSchema(
    z.object({
      name: z.string().min(3).max(120),
      outletId: z.string(),
      headline: z.string().min(1).max(160),
      offer: z.string().max(120),
      offerHi: z.string().max(160).optional(),
      zoneIds: z.array(z.string()).min(1),
      budget: z.number().positive().max(10000000),
      dailyCap: z.number().positive(),
      minimumCrowd: z.number().nonnegative(),
      minimumDwell: z.number().nonnegative(),
      weights: z.record(z.string(), z.number().min(0).max(1)),
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      destination: z.string().max(5).optional(),
      internationalOnly: z.boolean(),
      delayTrigger: z.number().nonnegative(),
      festivalId: z.string().max(100).optional(),
      eventTrigger: z.enum(["", "gate-change", "boarding"]).optional(),
      frequencyCap: z.number().int().positive(),
      category: z.string().max(30),
      airlineId: z.string().optional(),
      screenIds: z.array(z.string()).optional(),
      gateIds: z.array(z.string()).optional(),
      headlineHi: z.string().optional(),
      image: z.string().max(1400000).optional(),
    }),
  ),
  "/api/campaigns/{id}": z.toJSONSchema(
    z
      .object({
        paused: z.boolean().optional(),
        stock: z.boolean().optional(),
        budget: z.number().positive().optional(),
        weights: z.record(z.string(), z.number().min(0).max(1)).optional(),
      })
      .strict(),
  ),
  "/api/creatives/generate": z.toJSONSchema(
    z.object({ brief: z.string().min(5).max(1000) }),
  ),
  "/api/inventory/book": z.toJSONSchema(
    z.object({
      screenId: z.string(),
      campaignId: z.string(),
      timestamp: z.number().int().positive(),
    }),
  ),
};

function responseSchema(url, method) {
  if (url === "/api/health")
    return object({
      status: { type: "string", enum: ["ok"] },
      database: { type: "string", enum: ["sqlite"] },
      source: { type: "string", enum: ["mock-aidx", "vendor-api"] },
      sequence: { type: "integer" },
    });
  if (url === "/api/flights")
    return { $ref: "#/components/schemas/FlightPage" };
  if (url.startsWith("/api/flights/"))
    return { $ref: "#/components/schemas/Flight" };
  if (url === "/api/campaigns" && method === "get")
    return { $ref: "#/components/schemas/CampaignList" };
  if (url.startsWith("/api/campaigns"))
    return { $ref: "#/components/schemas/Campaign" };
  if (url === "/api/decisions")
    return { $ref: "#/components/schemas/DecisionList" };
  if (url.includes("/decision"))
    return { $ref: "#/components/schemas/Decision" };
  if (url.includes("/simulation/"))
    return { $ref: "#/components/schemas/Clock" };
  if (url.includes("/inventory/book"))
    return { $ref: "#/components/schemas/Booking" };
  if (url.startsWith("/api/screens/"))
    return { $ref: "#/components/schemas/Screen" };
  if (
    /^\/api\/(zones|terminals|gates|screens|outlets|vendors|airlines|incidents|partners|creatives|packages|calendarEvents)(\/|$)/.test(
      url,
    )
  ) {
    if (
      method === "get" &&
      /^\/api\/(zones|terminals|gates|screens|outlets|vendors|airlines|incidents|partners|creatives|packages|calendarEvents)$/.test(
        url,
      )
    )
      return { $ref: "#/components/schemas/EntityList" };
    return { $ref: "#/components/schemas/Entity" };
  }
  if (
    method === "get" &&
    /^\/api\/(aircraft-types|gate-assignments|feeds\/aodb\/snapshot)$/.test(url)
  )
    return {
      type: "array",
      items: { type: "object", additionalProperties: true },
    };
  return {
    oneOf: [
      { type: "object", additionalProperties: true },
      { type: "array", items: { type: "object", additionalProperties: true } },
    ],
    description:
      "Endpoint-specific JSON result; fields reflect the canonical records returned by this route.",
  };
}

function requestSchema(url, method) {
  const path = url.replace(/:([\w]+)/g, "{$1}");
  if (zodSchemas[path]) return zodSchemas[path];
  if (path === "/api/simulation/control")
    return object({
      action: {
        type: "string",
        enum: ["play", "pause", "reset", "speed", "jump"],
      },
      speed: { type: "integer", enum: [1, 10, 60] },
      time: { type: "string", format: "date-time" },
    });
  if (path === "/api/simulation/events")
    return { $ref: "#/components/schemas/SimulationEvent" };
  if (path === "/api/feeds/aidx")
    return object(
      {
        xml: {
          type: "string",
          description: "AIDX XML without a DTD or external entities",
        },
      },
      ["xml"],
    );
  if (/^\/api\/campaigns\/\{id\}\/(approve|reject)$/.test(path))
    return object({
      brandSafe: { type: "boolean" },
      reason: { type: "string", maxLength: 300 },
    });
  if (path === "/api/screens/{id}/override")
    return object(
      {
        campaignId: { type: "string" },
        reason: { type: "string", minLength: 5, maxLength: 300 },
      },
      ["campaignId", "reason"],
    );
  if (path === "/api/config")
    return object({
      adminAppearance: { type: "string", enum: ["dark", "light"] },
      forecastFillRate: { type: "number", minimum: 0, maximum: 1 },
      currency: { type: "string", enum: ["USD", "INR", "EUR", "GBP"] },
      exploration: { type: "number", minimum: 0, maximum: 0.2 },
      frequencyCap: { type: "integer", minimum: 1, maximum: 1000 },
      competitorSeparation: { type: "boolean" },
      language: { type: "string", enum: ["en", "hi"] },
    });
  if (path === "/api/inventory/book")
    return { $ref: "#/components/schemas/BookingInput" };
  if (/^\/api\/promos\/\{token\}\/(scan|claim|redeem|share)$/.test(path))
    return { $ref: "#/components/schemas/PromotionAction" };
  if (
    method === "post" &&
    /^\/api\/(zones|terminals|gates|screens|outlets|vendors|airlines|incidents|partners|creatives|packages|calendarEvents)$/.test(
      path,
    )
  )
    return { $ref: "#/components/schemas/EntityInput" };
  if (
    method === "patch" &&
    /^\/api\/(zones|terminals|gates|screens|outlets|vendors|airlines|incidents|partners|creatives|packages|calendarEvents)\/\{id\}$/.test(
      path,
    )
  )
    return { $ref: "#/components/schemas/EntityInput" };
  return undefined;
}

function queryParameters(url) {
  const params = [];
  if (url === "/api/analytics/heatmap")
    params.push(
      {
        name: "segment",
        in: "query",
        schema: {
          type: "string",
          enum: ["holiday", "family", "business", "international"],
        },
      },
      { name: "date", in: "query", schema: { type: "string", format: "date" } },
    );
  if (url === "/api/flights")
    params.push(
      { name: "airlineId", in: "query", schema: { type: "string" } },
      { name: "q", in: "query", schema: { type: "string" } },
      {
        name: "offset",
        in: "query",
        schema: { type: "integer", minimum: 0, default: 0 },
      },
      {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
      },
    );
  if (url === "/api/inventory")
    params.push({
      name: "campaignId",
      in: "query",
      schema: { type: "string" },
    });
  if (url === "/api/recommendations/slots")
    params.push({
      name: "campaignId",
      in: "query",
      schema: { type: "string" },
    });
  if (url === "/api/decisions")
    params.push({ name: "q", in: "query", schema: { type: "string" } });
  if (/^\/api\/analytics\/(retailer|segments|history|report)$/.test(url))
    params.push({ name: "outletId", in: "query", schema: { type: "string" } });
  if (url === "/api/analytics/airline")
    params.push({ name: "airlineId", in: "query", schema: { type: "string" } });
  return params;
}

export function createSpecification(routes, campaignSchema) {
  const paths = {};
  for (const [method, url] of routes) {
    if (!url.startsWith("/api/")) continue;
    const normalized = url.replace(/:([\w]+)/g, "{$1}");
    const parameters = [
      ...[...url.matchAll(/:([\w]+)/g)].map((match) => ({
        name: match[1],
        in: "path",
        required: true,
        schema: { type: "string", minLength: 1 },
      })),
      ...queryParameters(url),
    ];
    const createsResource =
      method === "post" &&
      (url === "/api/campaigns" ||
        url === "/api/inventory/book" ||
        url.endsWith("/duplicate") ||
        /^\/api\/(zones|terminals|gates|screens|outlets|vendors|airlines|incidents|partners|creatives|packages|calendarEvents)$/.test(
          url,
        ));
    const successCode =
      method === "delete" ? "204" : createsResource ? "201" : "200";
    const operation = {
      operationId: `${method}_${url.replace(/[^a-z0-9]/gi, "_")}`,
      summary: `${method.toUpperCase()} ${url}`,
      parameters,
      responses: {
        [successCode]:
          successCode === "204"
            ? { description: "Deleted successfully" }
            : {
                description: createsResource
                  ? "Created successfully"
                  : "Successful response",
                content: responseContent(url, method),
              },
        400: {
          description: "Invalid request or feed payload",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        404: {
          description: "Record or endpoint not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        409: {
          description:
            "State conflict, unavailable resource, or business-rule rejection",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    };
    const body = requestSchema(url, method);
    if (body)
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: body } },
      };
    paths[normalized] ??= {};
    paths[normalized][method] = operation;
  }
  if (paths["/api/campaigns"]?.post?.requestBody)
    paths["/api/campaigns"].post.requestBody.content[
      "application/json"
    ].schema = campaignSchema
      ? z.toJSONSchema(campaignSchema)
      : zodSchemas["/api/campaigns"];
  return {
    openapi: "3.1.0",
    info: {
      title: "MERIDIAN Airport Retail Intelligence API",
      version: "1.0.0",
      description:
        "Synthetic no-auth airport retail API. Times use ISO UTC or epoch milliseconds. The /api/events endpoint streams update events using Server-Sent Events.",
    },
    servers: [{ url: "/" }],
    paths,
    components: { schemas },
  };
}

function responseContent(url, method) {
  if (url === "/api/analytics/report" || url === "/api/docs")
    return { "text/html": { schema: { type: "string" } } };
  if (url === "/api/events")
    return {
      "text/event-stream": {
        schema: { type: "string", description: "SSE update events" },
      },
    };
  if (url === "/api/promos/:token/qr")
    return { "image/svg+xml": { schema: { type: "string" } } };
  return {
    "application/json": { schema: responseSchema(url, method) },
  };
}

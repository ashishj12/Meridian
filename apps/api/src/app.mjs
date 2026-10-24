import { createRuntimeCoordinator } from "./services/runtime-coordinator.mjs";
import express from "express";
import { z } from "zod";
import path from "node:path";
import { EntityRepository } from "./repositories/EntityRepository.mjs";
import { AirportEngine } from "./services/AirportEngine.mjs";
import { createSpecification } from "./config/openapi.mjs";
import { publicBase } from "./config/public-url.mjs";
import { campaignSchema } from "./validators/campaign.schema.mjs";
import { createCatalogService } from "./services/catalog.service.mjs";
import { registerApiRoutes } from "./routes/index.mjs";

/** Composition root: construct dependencies, install middleware, register routes and own shutdown. */
export function createApp({
  store = new EntityRepository(),
  timer = true,
} = {}) {
  const engine = new AirportEngine(store);
  const app = express();
  const clients = new Set();
  const latencies = [];
  const coordinator = createRuntimeCoordinator(engine, { timer });
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    coordinator.synchronize();
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use((req, res, next) => {
    const started = performance.now();
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.on("finish", () => {
      if (!req.path.startsWith("/api/") || req.path === "/api/events") return;
      latencies.push(performance.now() - started);
      if (latencies.length > 200) latencies.shift();
    });
    next();
  });
  const counts = new Map();
  app.use("/api", (req, res, next) => {
    const key = req.ip + ":" + (req.method === "GET" ? "read" : "write");
    const now = Date.now();
    const bucket = counts.get(key) || { time: now, n: 0 };
    if (now - bucket.time > 60000) {
      bucket.time = now;
      bucket.n = 0;
    }
    bucket.n++;
    counts.set(key, bucket);
    if (counts.size > 1000) counts.clear();
    if (bucket.n > (req.method === "GET" ? 2000 : 600))
      return res.status(429).json({ error: "Rate limit; try again shortly" });
    next();
  });
  const act = (fn) => (req, res, next) => {
    try {
      const result =
        ["POST", "PATCH", "DELETE"].includes(req.method) &&
        req.path !== "/api/creatives/generate" &&
        req.path !== "/api/feeds/aidx"
          ? coordinator.execute(() => fn(req, res))
          : fn(req, res);
      if (result instanceof Promise) result.catch(next);
    } catch (e) {
      next(e);
    }
  };
  const changed = () => {
    engine.evaluate(false);
    engine.emit("campaign.state");
  };
  engine.on((e) => {
    for (const res of clients)
      res.write(
        `id: ${e.sequence}\nevent: update\ndata: ${JSON.stringify(e)}\n\n`,
      );
  });
  const { required, validateEntity, validateCampaign } =
    createCatalogService(store);
  registerApiRoutes(app, {
    store,
    engine,
    coordinator,
    clients,
    latencies,
    act,
    changed,
    required,
    validateEntity,
    validateCampaign,
    publicBase,
    campaignSchema,
  });
  app.get("/api/openapi.json", (req, res) =>
    res.json(createSpecification(routes, campaignSchema)),
  );
  const web = path.resolve("dist");
  app.use(express.static(web));
  app.get("/{*path}", (req, res) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "Endpoint not found" });
    res.sendFile(path.join(web, "index.html"));
  });
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res
      .status(
        err instanceof z.ZodError
          ? 400
          : /not found/i.test(err.message)
            ? 404
            : /already|expired|unavailable|budget|referenced/i.test(err.message)
              ? 409
              : 400,
      )
      .json({
        error:
          err instanceof z.ZodError
            ? err.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : err.message,
      });
  });
  const routes = [];
  for (const layer of app.router.stack)
    if (layer.route)
      for (const method of Object.keys(layer.route.methods))
        routes.push([method, layer.route.path]);
  return {
    app,
    engine,
    store,
    coordinator,
    close() {
      coordinator.close();
      for (const res of clients) res.end();
      store.close();
    },
  };
}

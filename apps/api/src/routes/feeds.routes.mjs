import { createFeedsController } from "../controllers/feeds.controller.mjs";

export function registerFeedsRoutes(app, context) {
  const controller = createFeedsController(context);
  app.post("/api/feeds/aidx", controller.ingestAidx);
  app.get("/api/feeds/health", controller.health);
  app.get("/api/feeds/aodb/snapshot", controller.aodbSnapshot);
}

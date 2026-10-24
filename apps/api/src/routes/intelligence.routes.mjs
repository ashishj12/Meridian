import { createIntelligenceController } from "../controllers/intelligence.controller.mjs";

export function registerIntelligenceRoutes(app, context) {
  const controller = createIntelligenceController(context);
  app.get("/api/decisions", controller.decisions);
  app.get("/api/config", controller.configuration);
  app.patch("/api/config", controller.updateConfiguration);
}

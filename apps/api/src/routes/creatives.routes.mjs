import { createCreativesController } from "../controllers/creatives.controller.mjs";

export function registerCreativesRoutes(app, context) {
  const controller = createCreativesController(context);
  app.post("/api/creatives/generate", controller.generate);
}

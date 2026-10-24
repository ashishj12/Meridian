import { createScreensController } from "../controllers/screens.controller.mjs";

export function registerScreensRoutes(app, context) {
  const controller = createScreensController(context);
  app.get("/api/screens/:id/decision", controller.decision);
  app.get("/api/screens/:id/playlist", controller.playlist);
  app.post("/api/screens/:id/override", controller.override);
}

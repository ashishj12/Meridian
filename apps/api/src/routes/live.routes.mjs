import { createLiveController } from "../controllers/live.controller.mjs";

export function registerLiveRoutes(app, context) {
  const controller = createLiveController(context);
  app.get("/api/events", controller.subscribe);
}

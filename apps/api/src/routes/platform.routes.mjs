import { createPlatformController } from "../controllers/platform.controller.mjs";

export function registerPlatformRoutes(app, context) {
  const controller = createPlatformController(context);
  app.get("/api/state", controller.snapshot);
  app.get("/api/health", controller.health);
  app.get("/api/aircraft-types", controller.aircraftTypes);
  app.get("/api/gate-assignments", controller.gateAssignments);
  app.get("/api/zones/:id/presence", controller.zonePresence);
}

import { createSimulationController } from "../controllers/simulation.controller.mjs";

export function registerSimulationRoutes(app, context) {
  const controller = createSimulationController(context);
  app.get("/api/simulation/state", controller.state);
  app.post("/api/simulation/control", controller.control);
  app.post("/api/simulation/events", controller.injectEvent);
}

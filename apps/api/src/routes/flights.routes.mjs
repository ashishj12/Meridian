import { createFlightsController } from "../controllers/flights.controller.mjs";

export function registerFlightsRoutes(app, context) {
  const controller = createFlightsController(context);
  app.get("/api/flights", controller.list);
  app.get("/api/flights/:id", controller.read);
}

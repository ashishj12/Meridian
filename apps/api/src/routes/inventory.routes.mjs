import { createInventoryController } from "../controllers/inventory.controller.mjs";

export function registerInventoryRoutes(app, context) {
  const controller = createInventoryController(context);
  app.get("/api/inventory", controller.calendar);
  app.get("/api/recommendations/slots", controller.recommendations);
  app.post("/api/inventory/book", controller.book);
}

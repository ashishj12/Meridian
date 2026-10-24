import { createAnalyticsController } from "../controllers/analytics.controller.mjs";

export function registerAnalyticsRoutes(app, context) {
  const controller = createAnalyticsController(context);
  app.get("/api/analytics/heatmap", controller.heatmap);
  app.get("/api/analytics/yield", controller.yieldForecast);
  app.get("/api/analytics/retailer", controller.retailer);
  app.get("/api/analytics/airline", controller.airline);
  app.get("/api/analytics/segments", controller.segments);
  app.get("/api/analytics/history", controller.history);
  app.get("/api/analytics/report", controller.report);
}

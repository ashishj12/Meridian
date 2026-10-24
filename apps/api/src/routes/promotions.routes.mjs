import { createPromotionsController } from "../controllers/promotions.controller.mjs";

export function registerPromotionsRoutes(app, context) {
  const controller = createPromotionsController(context);
  app.get("/api/promos/:token", controller.read);
  app.get("/api/promos/:token/qr", controller.qr);
  for (const action of ["scan", "claim", "redeem", "share"]) {
    app.post(`/api/promos/:token/${action}`, controller.applyAction(action));
  }
}

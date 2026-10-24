import { createCampaignsController } from "../controllers/campaigns.controller.mjs";

export function registerCampaignsRoutes(app, context) {
  const controller = createCampaignsController(context);
  app.get("/api/campaigns", controller.list);
  app.post("/api/campaigns", controller.create);
  app.patch("/api/campaigns/:id", controller.update);
  app.post("/api/campaigns/:id/duplicate", controller.duplicate);
  for (const action of ["approve", "reject"]) {
    app.post(`/api/campaigns/:id/${action}`, controller.review(action));
  }
}

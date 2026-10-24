import { createMasterDataController } from "../controllers/master-data.controller.mjs";

export function registerMasterDataRoutes(app, context) {
  const controller = createMasterDataController(context);
  for (const kind of [
    "zones",
    "terminals",
    "gates",
    "screens",
    "outlets",
    "vendors",
    "airlines",
    "incidents",
    "partners",
    "creatives",
    "packages",
    "calendarEvents",
  ]) {
    app.get(`/api/${kind}`, controller.list(kind));
    app.post(`/api/${kind}`, controller.create(kind));
    app.patch(`/api/${kind}/:id`, controller.update(kind));
    app.delete(`/api/${kind}/:id`, controller.remove(kind));
  }
}

import { z } from "zod";

/** Shared reference checks for master records and campaign commands. */
export function createCatalogService(store) {
  function required(kind, id) {
    const v = store.get(kind, id);
    if (!v) throw new Error(`${kind} record not found`);
    return v;
  }
  function validateEntity(kind, body) {
    const schema = z
      .object({
        id: z.string().max(80).optional(),
        name: z.string().min(1).max(160).optional(),
      })
      .passthrough();
    const v = schema.parse(body);
    if (kind === "calendarEvents") {
      z.object({
        name: z.string().min(1),
        start: z.iso.datetime(),
        end: z.iso.datetime(),
        zoneIds: z.array(z.string()).optional(),
      }).parse(v);
      if (Date.parse(v.end) <= Date.parse(v.start))
        throw new Error("Calendar end must follow start");
      for (const zone of v.zoneIds || []) required("zones", zone);
    }
    if (kind === "packages") {
      z.array(z.string()).min(1).max(180).parse(v.screenIds);
      for (const id of v.screenIds) required("screens", id);
    }
    if (
      v.image &&
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(v.image)
    )
      throw new Error("Only PNG, JPEG or WebP raster images allowed");
    if (kind === "airlines" && v.goodwillThreshold !== undefined)
      z.number().min(1).max(240).parse(v.goodwillThreshold);
    if (!["incidents", "partners"].includes(kind) && !v.name)
      throw new Error("Name required");
    if (["screens", "outlets", "gates"].includes(kind)) {
      const zone = required("zones", v.zoneId);
      if (v.terminal && v.terminal !== zone.terminal)
        throw new Error("Terminal must match the selected zone");
    }
    if (kind === "zones") required("terminals", v.terminal);
    if (kind === "screens") {
      if (v.gate && required("gates", v.gate).zoneId !== v.zoneId)
        throw new Error("Gate must belong to the screen zone");
      z.object({
        orientation: z.enum(["portrait", "landscape"]),
        size: z.number().positive(),
        status: z.enum(["online", "degraded", "offline"]),
        nearestGates: z.array(z.string()),
      }).parse(v);
      for (const g of v.nearestGates) required("gates", g);
    }
    if (kind === "incidents")
      z.object({
        severity: z.enum(["low", "medium", "high", "critical"]),
        owner: z.string().min(1),
        status: z.enum(["open", "investigating", "resolved"]),
      }).parse(v);
    return v;
  }
  function validateCampaign(c) {
    if (c.festivalId) required("calendarEvents", c.festivalId);
    required("outlets", c.outletId);
    if (c.airlineId) required("airlines", c.airlineId);
    for (const id of c.screenIds || []) required("screens", id);
    for (const id of c.gateIds || []) required("gates", id);
    for (const id of c.zoneIds) required("zones", id);
    if (Date.parse(c.end) <= Date.parse(c.start))
      throw new Error("End must follow start");
    if (
      c.image &&
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(c.image)
    )
      throw new Error("Only PNG, JPEG or WebP raster images allowed");
  }
  return { required, validateEntity, validateCampaign };
}

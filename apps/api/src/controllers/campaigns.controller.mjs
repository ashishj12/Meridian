import { z } from "zod";
import { randomUUID } from "node:crypto";

/** HTTP validation and response mapping for campaigns. Business decisions stay in services. */
export function createCampaignsController(context) {
  const {
    store,
    engine,
    act,
    changed,
    required,
    validateCampaign,
    campaignSchema,
  } = context;
  return {
    list: (req, res) => res.json(store.all("campaigns")),
    create: act((req, res) => {
      const body = campaignSchema.parse(req.body);
      validateCampaign(body);
      const c = {
        ...body,
        id: randomUUID(),
        status: "pending",
        creativeApproved: false,
        brandSafe: true,
        paused: false,
        stock: true,
        spend: 0,
        performance: 0.2,
        priority: 0.3,
        affinity: 1,
        color: "#c4d2ed",
        createdAt: new Date(engine.clock.time).toISOString(),
      };
      store.put("campaigns", c);
      changed();
      res.status(201).json(c);
    }),
    update: act((req, res) => {
      const c = required("campaigns", req.params.id);
      const patch = z
        .object({
          paused: z.boolean().optional(),
          stock: z.boolean().optional(),
          budget: z.number().positive().optional(),
          weights: z.record(z.string(), z.number().min(0).max(1)).optional(),
        })
        .strict()
        .parse(req.body);
      Object.assign(c, patch);
      store.put("campaigns", c);
      changed();
      res.json(c);
    }),
    duplicate: act((req, res) => {
      const c = required("campaigns", req.params.id);
      const copy = {
        ...c,
        id: randomUUID(),
        name: `${c.name} · again`,
        spend: 0,
        status: "pending",
        creativeApproved: false,
      };
      store.put("campaigns", copy);
      changed();
      res.status(201).json(copy);
    }),
    review: (action) =>
      act((req, res) => {
        const c = required("campaigns", req.params.id);
        if (action === "approve" && req.body.brandSafe !== true)
          throw new Error("Complete the brand safety checklist");
        c.status = action === "approve" ? "approved" : "rejected";
        c.creativeApproved = action === "approve";
        c.reviewReason = String(
          req.body.reason || "Reviewed by Media Manager",
        ).slice(0, 300);
        store.put("campaigns", c);
        changed();
        res.json(c);
      }),
  };
}

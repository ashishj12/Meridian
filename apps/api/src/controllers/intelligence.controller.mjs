import { z } from "zod";

/** HTTP validation and response mapping for intelligence. Business decisions stay in services. */
export function createIntelligenceController(context) {
  const { store, act, changed } = context;
  return {
    decisions: (req, res) => {
      const q = String(req.query.q || "").toLowerCase();
      res.json(
        store
          .all("decisions")
          .filter((d) => !q || JSON.stringify(d).toLowerCase().includes(q))
          .slice(-100)
          .reverse(),
      );
    },
    configuration: (req, res) => res.json(store.get("config", "rules")),
    updateConfiguration: act((req, res) => {
      const patch = z
        .object({
          adminAppearance: z.enum(["dark", "light"]).optional(),
          forecastFillRate: z.number().min(0).max(1).optional(),
          currency: z.enum(["USD", "INR", "EUR", "GBP"]).optional(),
          exploration: z.number().min(0).max(0.2).optional(),
          frequencyCap: z.number().int().min(1).max(1000).optional(),
          competitorSeparation: z.boolean().optional(),
          language: z.enum(["en", "hi"]).optional(),
          theme: z
            .object({
              name: z.string().min(1).max(30),
              accent: z.string().regex(/^#[\da-fA-F]{6}$/),
              logo: z.string().max(8),
            })
            .optional(),
        })
        .parse(req.body);
      const c = { ...store.get("config", "rules"), ...patch };
      store.put("config", c);
      changed();
      res.json(c);
    }),
  };
}

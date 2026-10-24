import { z } from "zod";

/** HTTP validation and response mapping for simulation. Business decisions stay in services. */
export function createSimulationController(context) {
  const { engine, act } = context;
  return {
    state: (req, res) => res.json(engine.clock),
    control: act((req, res) => {
      const input = z
        .object({
          action: z
            .enum(["play", "pause", "reset", "speed", "jump"])
            .optional(),
          speed: z
            .union([z.literal(1), z.literal(10), z.literal(60)])
            .optional(),
          time: z.iso.datetime().optional(),
        })
        .parse(req.body);
      engine.control(input);
      res.json(engine.clock);
    }),
    injectEvent: act((req, res) => {
      const input = z
        .object({
          id: z.string().max(100).optional(),
          type: z.enum([
            "delay",
            "gate-change",
            "screen-offline",
            "boarding",
            "departure",
            "arrival",
            "cancellation",
            "evidence",
            "feed-lag",
            "creative-failure",
          ]),
          flightId: z.string().optional(),
          screenId: z.string().optional(),
          campaignId: z.string().optional(),
          minutes: z.number().min(0).max(1440).optional(),
          gate: z.string().optional(),
          mode: z
            .enum([
              "fresh",
              "stale",
              "missing",
              "contradictory",
              "unverifiable",
            ])
            .optional(),
        })
        .parse(req.body);
      res.json(engine.event(input));
    }),
  };
}

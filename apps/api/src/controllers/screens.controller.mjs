import { z } from "zod";

/** HTTP validation and response mapping for screens. Business decisions stay in services. */
export function createScreensController(context) {
  const { store, engine, act, changed, required } = context;
  return {
    decision: act((req, res) =>
      res.json(required("playlists", req.params.id).decision),
    ),
    playlist: act((req, res) => res.json(required("playlists", req.params.id))),
    override: act((req, res) => {
      const v = z
        .object({ campaignId: z.string(), reason: z.string().min(5).max(300) })
        .parse(req.body);
      required("campaigns", v.campaignId);
      const s = required("screens", req.params.id);
      s.override = { ...v, timestamp: engine.clock.time };
      store.put("screens", s);
      changed();
      res.json(s);
    }),
  };
}

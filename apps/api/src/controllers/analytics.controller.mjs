import {
  segmentHeatmap,
  sevenDayYield,
} from "../services/schedule.service.mjs";
import { z } from "zod";
import { escapeHtml } from "../views/html.mjs";
import {
  performanceInsights,
  airlineInsights,
} from "../services/analytics.service.mjs";

/** HTTP validation and response mapping for analytics. Business decisions stay in services. */
export function createAnalyticsController(context) {
  const { store, engine, act } = context;
  return {
    heatmap: act((req, res) => {
      const segment = z
        .enum(["holiday", "family", "business", "international"])
        .parse(req.query.segment || "holiday");
      const date = String(
        req.query.date ||
          new Date(engine.clock.time).toISOString().slice(0, 10),
      );
      res.json(segmentHeatmap(engine, segment, date));
    }),
    yieldForecast: act((req, res) => res.json(sevenDayYield(engine))),
    retailer: (req, res) => res.json(engine.metrics(req.query.outletId)),
    airline: (req, res) =>
      res.json(
        airlineInsights(store, engine, String(req.query.airlineId || "XY")),
      ),
    segments: (req, res) =>
      res.json(performanceInsights(store, String(req.query.outletId || "O1"))),
    history: (req, res) =>
      res.json(
        store
          .all("activity")
          .filter(
            (a) => !req.query.outletId || a.outletId === req.query.outletId,
          ),
      ),
    report: (req, res) => {
      const outlet = store.get("outlets", String(req.query.outletId || "O1"));
      const metrics = engine.metrics(outlet.id);
      res.type("html").send(
        `<!doctype html><meta name="viewport" content="width=device-width"><title>MERIDIAN advertiser report</title><style>body{font:18px system-ui;max-width:800px;margin:60px auto;padding:24px;color:#182436}h1{font-size:44px}td{padding:12px;border-bottom:1px solid #ddd}</style><p>MERIDIAN / ADVERTISER REPORT</p><h1>${escapeHtml(outlet.name)}</h1><p>Simulation ${new Date(engine.clock.time).toISOString()}. Model-estimated impressions. Revenue is simulated redemption × $24 attribution.</p><table>${Object.entries(
          metrics,
        )
          .map(
            ([k, v]) =>
              `<tr><td>${k}</td><td>${Number(v).toFixed(2)}</td></tr>`,
          )
          .join(
            "",
          )}</table><p>Use your browser's Print → Save as PDF to export.</p>`,
      );
    },
  };
}

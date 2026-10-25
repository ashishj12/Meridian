import { z } from "zod";
import { randomUUID } from "node:crypto";

/** HTTP validation and response mapping for inventory. Business decisions stay in services. */
export function createInventoryController(context) {
  const { store, engine, act, required } = context;
  return {
    calendar: (req, res) => {
      const tomorrow =
        Math.floor(engine.clock.time / 86400000) * 86400000 + 86400000;
      const slotForecasts = {};
      for (const zone of store.all("zones")) {
        const forecasts = Array.from({ length: 24 }, (_, hour) => {
          const timestamp = tomorrow + hour * 3600000;
          return {
            hour,
            count: engine.forecast(zone.id, timestamp).count,
          };
        });
        const sorted = forecasts
          .map((forecast) => forecast.count)
          .sort((a, b) => a - b);
        const premiumThreshold = sorted[Math.floor(sorted.length * 0.75)] || 0;
        for (const forecast of forecasts)
          slotForecasts[`${zone.id}:${forecast.hour}`] = {
            count: forecast.count,
            premium: forecast.count > 0 && forecast.count >= premiumThreshold,
            price: +(1.5 + forecast.count / 300).toFixed(2),
          };
      }
      res.json({
        screens: store.all("screens"),
        bookings: store.all("bookings"),
        presence: engine.presences,
        slotForecasts,
      });
    },
    recommendations: (req, res) =>
      res.json(engine.recommendations(String(req.query.campaignId || "C1"))),
    book: act((req, res) => {
      const v = z
        .object({
          screenId: z.string(),
          campaignId: z.string(),
          timestamp: z.number().int().positive(),
        })
        .parse(req.body);
      const screen = required("screens", v.screenId);
      if (screen.status === "offline") throw new Error("Screen unavailable");
      if (v.timestamp % 3600000 !== 0)
        throw new Error("Booking must start on an hour boundary");
      const c = required("campaigns", v.campaignId);
      if (c.zoneIds.length && !c.zoneIds.includes(screen.zoneId))
        throw new Error("Campaign placement excludes this screen");
      if (v.timestamp < Date.parse(c.start) || v.timestamp > Date.parse(c.end))
        throw new Error("Booking is outside the campaign schedule");
      const price = engine.quote(v.screenId, v.timestamp).price;
      let booking;
      store.transaction(() => {
        if (
          store
            .all("bookings")
            .some(
              (b) => b.screenId === v.screenId && b.timestamp === v.timestamp,
            )
        )
          throw new Error("Slot already booked");
        if (c.budget - c.spend < price) throw new Error("Insufficient budget");
        booking = { ...v, id: randomUUID(), price };
        store.put("bookings", booking);
        c.spend += price;
        store.put("campaigns", c);
      });
      engine.emit("inventory.booked");
      res.status(201).json(booking);
    }),
  };
}

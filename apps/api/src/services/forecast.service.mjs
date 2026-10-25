import { scheduleForDate } from "./schedule.service.mjs";

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Predict future presence and rank bookable inventory. */
export function forecastService(runtime, zoneId, timestamp, screen) {
  runtime.forecastCache ??= new Map();
  const cacheKey =
    zoneId +
    ":" +
    timestamp +
    ":" +
    (screen?.id || "zone") +
    ":" +
    Math.floor(runtime.clock.time / 900000);
  if (runtime.forecastCache.has(cacheKey))
    return runtime.forecastCache.get(cacheKey);
  runtime.scheduleCache ??= new Map();
  const day = Math.floor(timestamp / 86400000);
  if (!runtime.scheduleCache.has(day))
    runtime.scheduleCache.set(
      day,
      scheduleForDate(runtime.store.all("flights"), timestamp),
    );
  const futureFlights = runtime.scheduleCache.get(day);
  const estimate = {
    ...runtime.presence(zoneId, futureFlights, timestamp, screen),
    forecastModel: "synthetic-forward-schedule-v2",
  };
  if (runtime.forecastCache.size > 2500) runtime.forecastCache.clear();
  runtime.forecastCache.set(cacheKey, estimate);
  return estimate;
}
export function quoteService(runtime, screenId, timestamp) {
  const screen = runtime.store.get("screens", screenId);
  const forecast = runtime.forecast(screen.zoneId, timestamp, screen);
  return { forecast, price: +(1.5 + forecast.count / 300).toFixed(2) };
}
export function recommendationsService(runtime, campaignId = "C1") {
  const c = runtime.store.get("campaigns", campaignId);
  if (
    !c ||
    c.status !== "approved" ||
    !c.creativeApproved ||
    c.paused ||
    !c.stock ||
    !c.brandSafe
  )
    return [];
  const tomorrow =
    Math.floor(runtime.clock.time / 86400000) * 86400000 + 86400000;
  const bookings = runtime.store.all("bookings");
  const list = [];
  for (const s of runtime.store
    .all("screens")
    .filter(
      (s) =>
        s.status !== "offline" &&
        (!c.zoneIds.length || c.zoneIds.includes(s.zoneId)),
    ))
    for (const h of [10, 12, 14, 16, 18]) {
      const timestamp = tomorrow + h * 3600000;
      if (timestamp < Date.parse(c.start) || timestamp > Date.parse(c.end))
        continue;
      const { forecast, price } = runtime.quote(s.id, timestamp);
      if (
        price > c.budget - c.spend ||
        bookings.some((b) => b.screenId === s.id && b.timestamp === timestamp)
      )
        continue;
      const count = forecast.count;
      if (
        !count ||
        count < c.minimumCrowd ||
        forecast.dwell < c.minimumDwell ||
        (c.internationalOnly && forecast.segments.international < 0.5) ||
        (c.destination && !forecast.destinations.includes(c.destination))
      )
        continue;
      const fit = Object.entries(c.weights).reduce(
        (a, [k, w]) => a + w * (forecast.segments[k] || 0),
        0,
      );
      const impressions = Math.round(
        count * (s.status === "degraded" ? 0.5 : 1),
      );
      list.push({
        id: `${s.id}-${timestamp}`,
        screenId: s.id,
        zoneId: s.zoneId,
        timestamp,
        price,
        impressions,
        redemptions: Math.round(impressions * 0.02),
        score: (fit * impressions) / price,
        reason: `Date-specific forward schedule forecast; ${Math.round(fit * 100)}% weighted segment fit, ${forecast.dwell}m dwell, ${s.status} screen. ${c.delayTrigger ? "Conditional on a qualifying delay. " : ""}Execution revalidates all rules.`,
      });
    }
  const selected = [];
  const usedScreens = new Set();
  const usedHours = new Set();
  const usedImpressions = new Set();
  for (const slot of list.sort((a, b) => b.score - a.score)) {
    const hour = new Date(slot.timestamp).getUTCHours();
    if (
      usedScreens.has(slot.screenId) ||
      usedHours.has(hour) ||
      usedImpressions.has(slot.impressions)
    )
      continue;
    selected.push(slot);
    usedScreens.add(slot.screenId);
    usedHours.add(hour);
    usedImpressions.add(slot.impressions);
    if (selected.length === 3) break;
  }
  return selected;
}

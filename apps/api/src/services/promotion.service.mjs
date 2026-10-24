import { activeCalendarEvents } from "./calendar.service.mjs";
import { randomBytes, randomUUID } from "node:crypto";

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Issue anonymous claims and enforce expiry and single-use redemption. */
export function promoService(runtime, token, action, options = {}) {
  const p = runtime.store.get("promos", token);
  if (!p) throw new Error("Offer not found");
  if (p.expiry <= runtime.clock.time) throw new Error("Offer has expired");
  const c = runtime.store.get("campaigns", p.campaignId);
  if (
    !c ||
    c.status !== "approved" ||
    !c.creativeApproved ||
    !c.brandSafe ||
    runtime.clock.time < Date.parse(c.start) ||
    runtime.clock.time > Date.parse(c.end) ||
    c.paused ||
    !c.stock ||
    runtime.store.get("outlets", p.outletId)?.stock === false
  )
    throw new Error("Offer unavailable");
  if ((action === "claim" || action === "scan") && !p.claimed) {
    const presence = runtime.presences[p.zoneId];
    if (
      (c.festivalId &&
        !activeCalendarEvents(runtime.store, runtime.clock.time, p.zoneId).some(
          (event) => event.id === c.festivalId,
        )) ||
      (c.eventTrigger === "boarding" &&
        !presence.flightIds.some((id) =>
          ["Boarding", "BRD"].includes(
            runtime.store.get("flights", id)?.status,
          ),
        )) ||
      (c.eventTrigger === "gate-change" &&
        !runtime.store
          .all("feedEvents")
          .some(
            (event) =>
              event.type === "gate-change" &&
              event.zoneId === p.zoneId &&
              event.timestamp >= runtime.clock.time - 300000,
          )) ||
      (c.delayTrigger && presence.delay < c.delayTrigger) ||
      c.minimumCrowd > presence.count ||
      c.minimumDwell > presence.dwell ||
      (c.destination && !presence.destinations.includes(c.destination))
    )
      throw new Error("Offer no longer eligible for this gate audience");
  }
  let result;
  runtime.store.transaction(() => {
    const a = {
      id: randomUUID(),
      campaignId: p.campaignId,
      outletId: p.outletId,
      variant: p.variant || "A",
      timestamp: runtime.clock.time,
      segment:
        Object.entries(runtime.presences[p.zoneId]?.segments || {})
          .filter(([key]) => ["holiday", "family", "business"].includes(key))
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown",
    };
    if (action === "scan") {
      p.scans++;
      a.scans = 1;
      if (options.issue && !p.offerToken && !p.parentToken) {
        result = {
          ...p,
          id: randomBytes(24).toString("hex"),
          offerToken: token,
          scans: 1,
          claimed: false,
          redeemed: false,
        };
        delete result.childToken;
        runtime.store.put("promos", result);
      }
    } else if (action === "claim") {
      if (p.claimed) throw new Error("Already claimed");
      p.claimed = true;
      a.claims = 1;
    } else if (action === "redeem") {
      if (!p.claimed) throw new Error("Claim this offer first");
      if (p.redeemed) throw new Error("Already redeemed");
      p.redeemed = true;
      a.redemptions = 1;
      a.revenue = 24;
    } else if (action === "share") {
      if (p.parentToken || p.childToken)
        throw new Error("Family share already issued");
      const child = {
        ...p,
        id: randomBytes(24).toString("hex"),
        parentToken: token,
        scans: 0,
        claimed: false,
        redeemed: false,
      };
      p.childToken = child.id;
      runtime.store.put("promos", child);
      result = child;
    }
    runtime.store.put("promos", p);
    if (action !== "share") runtime.store.put("activity", a);
  });
  if (action === "redeem") runtime.evaluate(false);
  runtime.emit(`promotion.${action}`, { campaignId: p.campaignId });
  return result || p;
}

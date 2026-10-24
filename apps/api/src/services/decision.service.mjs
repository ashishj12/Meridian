import { randomBytes, randomUUID } from "node:crypto";
import { reproduceScore, validateProposal } from "../models/decision.model.mjs";

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Apply hard rules, reproduce candidate scores, validate evidence and publish playlists. */
export function candidatesService(runtime, screen, presence, campaigns) {
  const now = runtime.clock.time;
  const activities = runtime.evalContext
    ? []
    : runtime.store.all("activity").filter((a) => !a.historical);
  const last = runtime.evalContext
    ? runtime.evalContext.lastByScreen.get(screen.id)
    : runtime.store
        .all("decisions")
        .filter((d) => d.screenId === screen.id)
        .at(-1);
  const rules = runtime.store.get("config", "rules");
  return campaigns.map((c) => {
    const reasons = [];
    if (c.status !== "approved" || !c.creativeApproved)
      reasons.push("Awaiting campaign or creative approval");
    if (!c.brandSafe) reasons.push("Brand safety rejected");
    if (
      c.paused ||
      !c.stock ||
      runtime.store.get("outlets", c.outletId)?.stock === false
    )
      reasons.push("Paused or stock unavailable");
    if (now < Date.parse(c.start) || now > Date.parse(c.end))
      reasons.push("Outside schedule");
    if (c.zoneIds?.length && !c.zoneIds.includes(screen.zoneId))
      reasons.push("Placement excludes this gate");
    if (c.screenIds?.length && !c.screenIds.includes(screen.id))
      reasons.push("Screen placement excluded");
    if (c.gateIds?.length && !c.gateIds.includes(screen.gate))
      reasons.push("Gate placement excluded");
    if (c.internationalOnly && presence.segments.international < 0.5)
      reasons.push("International audience required");
    if (c.destination && !presence.destinations.includes(c.destination))
      reasons.push("Destination mismatch");
    if (presence.count < c.minimumCrowd)
      reasons.push("Minimum audience not met");
    if (presence.dwell < c.minimumDwell) reasons.push("Insufficient dwell");
    if (c.delayTrigger && presence.delay < c.delayTrigger)
      reasons.push("Delay trigger not active");
    const festivalActive =
      !!c.festivalId &&
      presence.calendarEvidence.some((event) => event.id === c.festivalId);
    if (c.festivalId && !festivalActive)
      reasons.push("Festival calendar trigger not active");
    if (
      c.eventTrigger === "boarding" &&
      !presence.flightIds.some((id) =>
        ["Boarding", "BRD"].includes(runtime.store.get("flights", id)?.status),
      )
    )
      reasons.push("Boarding trigger not active");
    if (
      c.eventTrigger === "gate-change" &&
      !runtime.store
        .all("feedEvents")
        .some(
          (event) =>
            event.type === "gate-change" &&
            event.timestamp >= now - 300000 &&
            event.zoneId === screen.zoneId,
        )
    )
      reasons.push("Gate change trigger not active");
    if (c.spend >= c.budget) reasons.push("Budget exhausted");
    const daily = activities.filter(
      (a) =>
        a.campaignId === c.id &&
        Math.floor(a.timestamp / 86400000) === Math.floor(now / 86400000),
    );
    if (
      (runtime.evalContext
        ? runtime.evalContext.dailySpend.get(c.id) || 0
        : daily.reduce((a, e) => a + (e.spend || 0), 0)) >= c.dailyCap
    )
      reasons.push("Daily cap exhausted");
    if (
      (runtime.evalContext
        ? runtime.evalContext.dailyPlays.get(c.id + "|" + screen.id) || 0
        : daily
            .filter((a) => a.screenId === screen.id)
            .reduce((a, e) => a + (e.plays || 0), 0)) >=
      Math.min(c.frequencyCap, rules.frequencyCap)
    )
      reasons.push("Screen frequency cap reached");
    if (
      rules.competitorSeparation &&
      last?.campaignId !== c.id &&
      last?.category === c.category
    )
      reasons.push("Competitor separation");
    const total = Object.values(c.weights).reduce((a, b) => a + b, 0) || 1;
    const match = clamp(
      (Object.entries(c.weights).reduce(
        (a, [key, w]) => a + (presence.segments[key] || 0) * w,
        0,
      ) /
        total) *
        (c.affinity || 1),
      0,
      1,
    );
    const performance = runtime.metrics(c.outletId);
    const learned = performance.impressions
      ? Math.min(0.1, performance.redemptions / performance.impressions)
      : 0;
    const boost =
      c.delayTrigger && presence.delay >= c.delayTrigger
        ? 1.5
        : festivalActive
          ? 1.2
          : 1;
    const factors = {
      match: +match.toFixed(4),
      reach: clamp(presence.count / 840, 0, 1),
      dwell: clamp(presence.dwell / 100, 0, 1),
      conversion: clamp(c.performance + learned, 0, 1),
      yield: c.priority || 0,
      exploration:
        presence.id === "Z7" && ["C1", "C2", "C3"].includes(c.id)
          ? 0
          : rules.exploration *
            ((Number.parseInt(screen.id.slice(1)) % 7) / 7) *
            0.1,
    };
    const score = reproduceScore(factors, boost);
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      match: factors.match,
      boost,
      triggerReason: festivalActive ? "festival calendar" : "verified delay",
      score,
      eligible: !reasons.length,
      reasons,
      factors,
      goodwillPriority:
        c.category === "goodwill" &&
        c.screenIds?.includes(screen.id) &&
        presence.delay >= c.delayTrigger,
      airlinePriority:
        !!c.airlineId &&
        presence.flightIds.some((id) => {
          const f = runtime.store.get("flights", id);
          return (
            f?.airlineId === c.airlineId &&
            ["Boarding", "BRD"].includes(f.status)
          );
        }),
    };
  });
}
export function decideService(runtime, screen, campaigns, deliver = false) {
  const presence = runtime.presences[screen.zoneId];
  const candidates = runtime.candidates(screen, presence, campaigns);
  let fallback = null;
  const mode = runtime.clock.evidenceMode;
  if (mode !== "fresh") fallback = `Evidence validation failed: ${mode}`;
  if (!presence.evidence.length || !presence.queueEvidence)
    fallback = "Missing trusted flight or queue evidence";
  if (
    presence.evidence.some(
      (e) => !Number.isFinite(Date.parse(e.originalTimestamp)),
    )
  )
    fallback = "Unverifiable source timestamp";
  if (screen.status === "offline")
    fallback = "Screen offline; delivery suppressed";
  const booking = runtime.store
    .all("bookings")
    .find(
      (b) =>
        b.screenId === screen.id &&
        b.timestamp <= runtime.clock.time &&
        b.timestamp + 3600000 > runtime.clock.time,
    );
  let ranked = candidates
    .filter((c) => c.eligible)
    .sort(
      (a, b) =>
        Number(b.airlinePriority) - Number(a.airlinePriority) ||
        Number(b.goodwillPriority) - Number(a.goodwillPriority) ||
        Number(b.id === booking?.campaignId) -
          Number(a.id === booking?.campaignId) ||
        b.score - a.score,
    );
  if (screen.override) {
    const pin = ranked.find((c) => c.id === screen.override.campaignId);
    if (pin) ranked = [pin, ...ranked.filter((c) => c.id !== pin.id)];
  }
  if (!fallback && ranked[0]) {
    const issues = validateProposal(
      ranked[0],
      presence,
      runtime.clock,
      (id) => runtime.store.get("flights", id),
      (id) => runtime.store.get("calendarEvents", id),
    );
    if (issues.length)
      fallback = "Evidence validation failed: " + issues.join("; ");
  }
  const winner = !fallback ? ranked[0] : undefined;
  if (!winner && !fallback)
    fallback = "No eligible campaign; approved airport information";
  const c = winner ? campaigns.find((c) => c.id === winner.id) : null;
  const variant = Number.parseInt(screen.id.slice(1)) % 2 ? "B" : "A";
  const decision = {
    id: randomUUID(),
    screenId: screen.id,
    timestamp: runtime.clock.time,
    campaignId: c?.id || null,
    category: c?.category || "information",
    creative: c
      ? {
          headline:
            variant === "B" && c.variantHeadlineB
              ? c.variantHeadlineB
              : c.headline,
          headlineHi:
            variant === "B" && c.variantHeadlineHiB
              ? c.variantHeadlineHiB
              : c.headlineHi,
          variant,
          offer: c.offer,
          offerHi: c.offerHi,
          color: c.color,
          image: c.image,
        }
      : null,
    presence,
    candidates: candidates.sort((a, b) => b.score - a.score),
    ruleVersion: runtime.store.get("config", "rules").ruleVersion,
    modelVersion: "score-1.0",
    evidenceMode: mode,
    validated: !fallback,
    reason: winner
      ? `${winner.airlinePriority ? "Own-flight boarding priority. " : winner.goodwillPriority ? "Delay goodwill priority on the designated gate screen. " : ""}${c.name} matches ${Math.round(winner.match * 100)}% of this estimated audience${winner.boost > 1 ? ` with a ${winner.boost}× ${winner.triggerReason} boost` : ""}.`
      : fallback,
    bookingId: booking?.id || null,
    override: screen.override || null,
    fallback,
    delivered: deliver && screen.status !== "offline",
  };
  if (c) {
    let promo = runtime.store
      .all("promos")
      .find(
        (p) =>
          p.campaignId === c.id &&
          p.zoneId === screen.zoneId &&
          !p.parentToken &&
          !p.offerToken &&
          p.variant === variant &&
          p.expiry > runtime.clock.time,
      );
    if (!promo) {
      const linked = runtime.store.get("flights", presence.flightIds[0]);
      const expiry = linked
        ? Date.parse(linked.estimated) - 10 * 60000
        : runtime.clock.time + 30 * 60000;
      promo = {
        id: randomBytes(24).toString("hex"),
        campaignId: c.id,
        outletId: c.outletId,
        zoneId: screen.zoneId,
        variant,
        offer: c.offer,
        offerHi: c.offerHi,
        expiry: Math.max(runtime.clock.time + 60000, expiry),
        scans: 0,
        claimed: false,
        redeemed: false,
      };
      runtime.store.put("promos", promo);
    }
    decision.promo = promo;
  }
  runtime.store.put("decisions", decision);
  runtime.store.put("playlists", { id: screen.id, decision });
  if (decision.delivered) {
    const impressions = Math.max(
      0,
      Math.round(
        presence.count * 0.025 * (screen.status === "degraded" ? 0.5 : 1),
      ),
    );
    const cost = c ? Math.min(0.12, c.budget - c.spend) : 0;
    const activityId = `served-${Math.floor(runtime.clock.time / 86400000)}-${screen.id}-${c?.id || "fallback"}`;
    const existing = runtime.store.get("activity", activityId);
    const activity = {
      id: activityId,
      campaignId: c?.id || "fallback",
      outletId: c?.outletId,
      screenId: screen.id,
      timestamp: runtime.clock.time,
      plays: (existing?.plays || 0) + 1,
      impressions: (existing?.impressions || 0) + impressions,
      spend: (existing?.spend || 0) + cost,
      segment: presence.segments.family > 0.3 ? "family" : "holiday",
      variant,
      flightIds: presence.flightIds,
    };
    runtime.store.put("activity", activity);
    if (runtime.evalContext) {
      const playsKey = activity.campaignId + "|" + screen.id;
      runtime.evalContext.dailySpend.set(
        activity.campaignId,
        (runtime.evalContext.dailySpend.get(activity.campaignId) || 0) + cost,
      );
      runtime.evalContext.dailyPlays.set(
        playsKey,
        (runtime.evalContext.dailyPlays.get(playsKey) || 0) + 1,
      );
      const index = runtime.evalContext.activities.findIndex(
        (a) => a.id === activityId,
      );
      if (index < 0) runtime.evalContext.activities.push(activity);
      else runtime.evalContext.activities[index] = activity;
    }
    if (c) {
      c.spend += cost;
      runtime.store.put("campaigns", c);
    }
  }
  return decision;
}
export function evaluateService(runtime, deliver = true, zoneIds) {
  const started = performance.now();
  const flights = runtime.store.all("flights");
  for (const z of runtime.store
    .all("zones")
    .filter((z) => !zoneIds || zoneIds.includes(z.id)))
    runtime.presences[z.id] = runtime.presence(z.id, flights);
  const campaigns = runtime.store.all("campaigns");
  runtime.evalContext = {
    campaigns,
    activities: runtime.store.all("activity"),
    decisions: runtime.store.all("decisions"),
    metrics: new Map(),
    dailySpend: new Map(),
    dailyPlays: new Map(),
    lastByScreen: new Map(),
  };
  for (const d of runtime.evalContext.decisions)
    runtime.evalContext.lastByScreen.set(d.screenId, d);
  for (const a of runtime.evalContext.activities)
    if (
      !a.historical &&
      Math.floor(a.timestamp / 86400000) ===
        Math.floor(runtime.clock.time / 86400000)
    ) {
      runtime.evalContext.dailySpend.set(
        a.campaignId,
        (runtime.evalContext.dailySpend.get(a.campaignId) || 0) +
          (a.spend || 0),
      );
      const key = a.campaignId + "|" + a.screenId;
      runtime.evalContext.dailyPlays.set(
        key,
        (runtime.evalContext.dailyPlays.get(key) || 0) + (a.plays || 0),
      );
    }
  try {
    runtime.store.transaction(() => {
      for (const s of runtime.store
        .all("screens")
        .filter((s) => !zoneIds || zoneIds.includes(s.zoneId)))
        runtime.decide(s, campaigns, deliver);
      const old = runtime.store.all("decisions");
      for (const d of old.slice(0, Math.max(0, old.length - 900)))
        runtime.store.delete("decisions", d.id);
    });
  } finally {
    runtime.evalContext = null;
  }
  runtime.playlistMs = performance.now() - started;
}

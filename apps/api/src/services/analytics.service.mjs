export function performanceInsights(store, outletId) {
  const activities = store
    .all("activity")
    .filter((a) => a.outletId === outletId);
  const groupBy = (key) => {
    const groups = {};
    for (const a of activities) {
      const k = a[key] || "Unassigned";
      const g = (groups[k] ??= {
        key: k,
        impressions: 0,
        redemptions: 0,
        spend: 0,
        revenue: 0,
      });
      for (const metric of ["impressions", "redemptions", "spend", "revenue"])
        g[metric] += a[metric] || 0;
    }
    return Object.values(groups).map((g) => ({
      ...g,
      conversion: g.impressions ? g.redemptions / g.impressions : 0,
      roi: g.spend ? (g.revenue - g.spend) / g.spend : 0,
    }));
  };
  const segments = groupBy("segment").sort(
    (a, b) => b.conversion - a.conversion,
  );
  return {
    segments,
    variants: groupBy("variant"),
    recommendation: segments.length
      ? {
          segment: segments[0].key,
          weight: 0.9,
          reason: `${segments[0].redemptions} recorded redemptions / ${segments[0].impressions} model-estimated impressions. Compare performance before applying a higher audience weight; this is aggregate association, not a causal claim.`,
        }
      : null,
  };
}
export function airlineInsights(store, engine, airlineId) {
  const flights = store.all("flights").filter((f) => f.airlineId === airlineId);
  const total = flights.reduce((a, f) => a + f.pax, 0);
  const segments = Object.fromEntries(
    ["holiday", "family", "business", "international", "premium"].map((k) => [
      k,
      total
        ? flights.reduce((a, f) => a + (f.profile[k] || 0) * f.pax, 0) / total
        : 0,
    ]),
  );
  const activity = store
    .all("activity")
    .filter(
      (a) =>
        !a.historical &&
        a.flightIds?.some((id) => flights.some((f) => f.id === id)),
    );
  const impressions = activity.reduce((n, a) => {
    const all = a.flightIds
      .map((id) => store.get("flights", id))
      .filter(Boolean);
    const share =
      all.reduce((p, f) => p + (f.airlineId === airlineId ? f.pax : 0), 0) /
      (all.reduce((p, f) => p + f.pax, 0) || 1);
    return n + (a.impressions || 0) * share;
  }, 0);
  const own = engine.metrics(undefined, airlineId);
  return {
    passengers: total,
    flights: flights.length,
    segments,
    estimatedGateImpressions: Math.round(impressions),
    ownCampaignMetrics: own,
    destinations: [...new Set(flights.map((f) => f.destination))].slice(0, 6),
  };
}

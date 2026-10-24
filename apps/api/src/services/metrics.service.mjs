const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
/** Calculate delivery, scan and redemption totals from recorded activity. */
export function metricsService(runtime, outletId, airlineId) {
  const key = `${outletId || ""}:${airlineId || ""}`;
  if (runtime.evalContext?.metrics.has(key))
    return runtime.evalContext.metrics.get(key);
  const campaigns = (
    runtime.evalContext?.campaigns || runtime.store.all("campaigns")
  ).filter(
    (c) =>
      (!outletId || c.outletId === outletId) &&
      (!airlineId || c.airlineId === airlineId),
  );
  const ids = new Set(campaigns.map((c) => c.id));
  const activity = (
    runtime.evalContext?.activities || runtime.store.all("activity")
  ).filter(
    (a) =>
      ((!outletId && !airlineId) || ids.has(a.campaignId)) && !a.historical,
  );
  const totals = {
    plays: 0,
    impressions: 0,
    scans: 0,
    claims: 0,
    redemptions: 0,
    spend: 0,
    revenue: 0,
  };
  for (const a of activity)
    for (const k of Object.keys(totals)) totals[k] += a[k] || 0;
  const result = {
    ...totals,
    conversion: totals.impressions
      ? totals.redemptions / totals.impressions
      : 0,
    roi: totals.spend ? (totals.revenue - totals.spend) / totals.spend : 0,
  };
  runtime.evalContext?.metrics.set(key, result);
  return result;
}

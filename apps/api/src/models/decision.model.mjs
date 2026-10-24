export function reproduceScore(factors, boost = 1) {
  return +Math.min(
    1,
    Math.max(
      0,
      (0.6 * factors.match +
        0.1 * factors.reach +
        0.1 * factors.dwell +
        0.1 * factors.conversion +
        0.1 * factors.yield +
        (factors.exploration || 0)) *
        boost,
    ),
  ).toFixed(2);
}
export function validateProposal(
  candidate,
  presence,
  clock,
  lookup,
  lookupCalendar,
) {
  const issues = [];
  for (const evidence of presence.calendarEvidence || []) {
    const event = lookupCalendar?.(evidence.id);
    if (
      !event ||
      event.start !== evidence.start ||
      event.end !== evidence.end ||
      (event.zoneIds?.length && !event.zoneIds.includes(presence.id)) ||
      Date.parse(event.start) > clock.time ||
      Date.parse(event.end) <= clock.time
    )
      issues.push("Unverifiable calendar evidence");
  }
  if (!candidate?.eligible) issues.push("Hard eligibility rules failed");
  if (
    candidate &&
    reproduceScore(candidate.factors, candidate.boost) !== candidate.score
  )
    issues.push("Score cannot be reproduced");
  if (!presence.evidence.length || !presence.queueEvidence)
    issues.push("Missing trusted flight or queue evidence");
  for (const evidence of presence.evidence) {
    const flight = lookup(evidence.id);
    if (!flight) issues.push(`Missing flight ${evidence.id}`);
    else {
      if (
        flight.pax < 0 ||
        flight.pax > flight.seats ||
        flight.zoneId !== presence.id
      )
        issues.push(`Contradictory flight ${evidence.id}`);
      if (
        !["aodb-csv", "seed-aodb", "scenario-aodb", "mock-aidx"].includes(
          evidence.source,
        )
      )
        issues.push(`Untrusted adapter ${evidence.source}`);
    }
    if (!Number.isFinite(Date.parse(evidence.originalTimestamp)))
      issues.push("Unverifiable source timestamp");
    if (
      clock.time - evidence.receivedAt > 300000 ||
      evidence.receivedAt > clock.time + 1000
    )
      issues.push("Stale or future receipt time");
  }
  if (
    presence.queueEvidence &&
    clock.time - presence.queueEvidence.receivedAt > 300000
  )
    issues.push("Stale queue measurement");
  return [...new Set(issues)];
}

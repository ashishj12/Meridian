export const SCORE_WEIGHTS = Object.freeze({
  match: 0.6,
  reach: 0.1,
  dwell: 0.1,
  conversion: 0.1,
  yield: 0.1,
  exploration: 1,
});

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));

export function reproduceScore(factors, boost = 1, weights = SCORE_WEIGHTS) {
  return +Math.min(
    1,
    Math.max(
      0,
      (weights.match * factors.match +
        weights.reach * factors.reach +
        weights.dwell * factors.dwell +
        weights.conversion * factors.conversion +
        weights.yield * factors.yield +
        weights.exploration * (factors.exploration || 0)) *
        boost,
    ),
  ).toFixed(2);
}
export function recomputeCandidate(candidate) {
  const inputs = candidate?.scoreInputs;
  if (!inputs) return null;
  const total =
    Object.values(inputs.campaign.weights).reduce(
      (sum, weight) => sum + weight,
      0,
    ) || 1;
  const match = clamp(
    (Object.entries(inputs.campaign.weights).reduce(
      (sum, [key, weight]) =>
        sum + (inputs.presence.segments[key] || 0) * weight,
      0,
    ) /
      total) *
      inputs.campaign.affinity,
    0,
    1,
  );
  const factors = {
    match: +match.toFixed(4),
    reach: clamp(inputs.presence.count / 840, 0, 1),
    dwell: clamp(inputs.presence.dwell / 100, 0, 1),
    conversion: clamp(
      inputs.campaign.performance + inputs.learnedConversion,
      0,
      1,
    ),
    yield: inputs.campaign.priority,
    exploration: inputs.exploration,
  };
  return {
    factors,
    score: reproduceScore(factors, inputs.boost, inputs.scoreWeights),
  };
}

export function validateAiProposal(
  proposal,
  candidates,
  presence,
  clock,
  lookup,
  lookupCalendar,
) {
  const issues = [];
  if (proposal?.requestError)
    issues.push(`AI scorer request failed: ${proposal.requestError}`);
  const trustedIds = new Set([
    ...presence.evidence.map((item) => item.id),
    presence.queueEvidence?.id,
    ...(presence.calendarEvidence || []).map((item) => item.id),
  ]);
  for (const id of proposal?.evidenceIds || [])
    if (!trustedIds.has(id)) issues.push(`Untrusted evidence ID ${id}`);
  const generatedAt = Date.parse(proposal?.generatedAt);
  if (
    !Number.isFinite(generatedAt) ||
    clock.time - generatedAt > 300000 ||
    generatedAt > clock.time + 1000
  )
    issues.push("AI ranking timestamp is stale or unverifiable");
  if (!proposal?.ranking?.length) issues.push("AI ranking is empty");
  for (const item of proposal?.ranking || []) {
    const candidate = candidates.find((entry) => entry.id === item.campaignId);
    if (!candidate) {
      issues.push(`Unknown campaign ID ${item.campaignId}`);
      continue;
    }
    if (!candidate.eligible)
      issues.push(`Hard rules rejected ${item.campaignId}`);
    if (item.score !== candidate.score)
      issues.push(
        `AI score for ${item.campaignId} does not match recomputed score`,
      );
    issues.push(
      ...validateProposal(candidate, presence, clock, lookup, lookupCalendar),
    );
  }
  return [...new Set(issues)];
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
  const recomputed = recomputeCandidate(candidate);
  if (
    !recomputed ||
    recomputed.score !== candidate.score ||
    JSON.stringify(recomputed.factors) !== JSON.stringify(candidate.factors)
  )
    issues.push("Score cannot be reproduced from persisted inputs");
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

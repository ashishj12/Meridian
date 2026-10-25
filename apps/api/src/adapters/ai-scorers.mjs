import { z } from "zod";
import { requestText } from "./http-client.mjs";

export class OfflineHeuristicScorer {
  rank({ presence, candidates, now }) {
    const ranking = candidates
      .filter((candidate) => candidate.eligible)
      .map(({ id, score }) => ({ campaignId: id, score }));
    return {
      ranking,
      evidenceIds: [
        ...presence.evidence.map((item) => item.id),
        ...(presence.queueEvidence ? [presence.queueEvidence.id] : []),
        ...(presence.calendarEvidence || []).map((item) => item.id),
      ],
      rationale: ranking.length
        ? `Ranked ${ranking.length} eligible campaigns using the estimated crowd profile, verified feed evidence and deterministic campaign scores.`
        : "No campaign passed the deterministic eligibility rules.",
      generatedAt: new Date(now).toISOString(),
    };
  }
}

export class LlmAiScorer {
  constructor(options = {}) {
    this.isAsync = true;
    this.endpoint = options.endpoint || process.env.AI_SCORER_ENDPOINT;
    this.token = options.token || process.env.AI_SCORER_API_KEY;
    this.fetchImplementation = options.fetchImplementation;
  }

  async rank({ presence, candidates, now }) {
    const payload = await requestText(this.endpoint, {
      method: "POST",
      token: this.token,
      fetchImplementation: this.fetchImplementation,
      body: {
        profile: presence,
        eligibleCandidates: candidates
          .filter((candidate) => candidate.eligible)
          .map(({ id, name, score, factors, reasons }) => ({
            campaignId: id,
            name,
            score,
            factors,
            reasons,
          })),
      },
    });
    const response = z
      .object({
        ranking: z.array(
          z.object({
            campaignId: z.string(),
            score: z.number().min(0).max(1),
            evidenceIds: z.array(z.string()).default([]),
          }),
        ),
        rationale: z.string().min(1).max(1000),
        generatedAt: z.iso.datetime(),
      })
      .parse(JSON.parse(payload));
    return {
      ...response,
      evidenceIds: [
        ...new Set(response.ranking.flatMap((item) => item.evidenceIds)),
      ],
      requestTime: now,
    };
  }
}

export function createAiScorer(options = {}) {
  return (options.provider || process.env.AI_SCORER) === "llm"
    ? new LlmAiScorer(options)
    : new OfflineHeuristicScorer();
}

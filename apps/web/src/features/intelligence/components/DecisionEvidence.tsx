import { translateText } from "../../../i18n/index";
import { Panel } from "../../../shared/components/Panel";
import { SegmentBars } from "../../../shared/components/AudienceSegments";
import { percent } from "../../../shared/lib/format";
import type { ApiRecord } from "../../../shared/types/workspace";

export function DecisionPanel({ decision: d }: any) {
  return (
    <Panel
      title={translateText("Why this ad?")}
      tag={d.validated ? "VALIDATED" : "SAFE FALLBACK"}
    >
      <p>{translateText(d.reason)}</p>
      <div className="two-columns">
        <SegmentBars presence={d.presence} />
        <div className="candidate-list">
          {d.candidates
            .filter((c: ApiRecord) => c.eligible || c.id === "C3")
            .sort(
              (a: ApiRecord, b: ApiRecord) =>
                Number(b.id === d.campaignId) - Number(a.id === d.campaignId) ||
                b.score - a.score,
            )
            .slice(0, 3)
            .map((c: ApiRecord) => (
              <div key={c.id}>
                <div>
                  <b>{translateText(c.name)}</b>
                  <strong>{translateText(c.score.toFixed(2))}</strong>
                </div>
                <span className="bar-track">
                  <i style={{ width: percent(c.score) }} />
                </span>
                <small>
                  {translateText(
                    c.eligible
                      ? `${percent(c.match)} audience fit · ${c.boost}× trigger boost`
                      : c.reasons.join(" · "),
                  )}
                </small>
              </div>
            ))}
        </div>
      </div>
      <details>
        <summary>
          {translateText("Complete evidence trail \u00B7 ")}
          {translateText(d.modelVersion)}
          {translateText(" / ")}
          {translateText(d.ruleVersion)}
        </summary>
        <pre>{translateText(JSON.stringify(d, null, 2))}</pre>
      </details>
    </Panel>
  );
}

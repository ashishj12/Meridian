import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { api } from "../../../shared/api/client";
import { fmt, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function SegmentPerformance(context: WorkspaceContext) {
  const [data, setData] = useState<ApiRecord | null>(null);
  useEffect(() => {
    api("/analytics/segments?outletId=" + context.org).then(setData);
  }, [context.org, context.state.clock.sequence]);
  return (
    <Panel
      title={translateText("What your audience responds to")}
      tag={translateText("RECORDED PERFORMANCE")}
    >
      <div className="two-columns">
        <div>
          <h3>{translateText("Performance by segment")}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{translateText("Segment")}</th>
                  <th>{translateText("Impressions")}</th>
                  <th>{translateText("Redemptions")}</th>
                  <th>{translateText("Conversion")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.segments.map((r: ApiRecord) => (
                  <tr key={r.key}>
                    <td>{translateText(r.key)}</td>
                    <td>{translateText(fmt(r.impressions))}</td>
                    <td>{translateText(fmt(r.redemptions))}</td>
                    <td>
                      {translateText((r.conversion * 100).toFixed(2))}
                      {translateText("%")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {translateText(
            data?.recommendation && (
              <div className="ai-note">
                <Sparkles size={16} />
                <div>
                  <p>{translateText(data.recommendation.reason)}</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      const c = context.state.campaigns.find(
                        (c: ApiRecord) => c.outletId === context.org,
                      );
                      if (c)
                        context
                          .action(
                            "/campaigns/" + c.id,
                            {
                              weights: {
                                ...c.weights,
                                [data.recommendation.segment]:
                                  data.recommendation.weight,
                              },
                            },
                            "PATCH",
                          )
                          .then(() =>
                            context.notify(
                              "Suggested segment weight applied. Future decisions use the saved targeting.",
                            ),
                          );
                    }}
                  >
                    {translateText("Apply ")}
                    {translateText(data.recommendation.segment)}
                    {translateText(" weight \u2192")}
                    {translateText(" ")}
                    {translateText(data.recommendation.weight)}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
        <div>
          <h3>{translateText("A/B creative comparison")}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{translateText("Variant")}</th>
                  <th>{translateText("Impressions")}</th>
                  <th>{translateText("Conversion")}</th>
                  <th>{translateText("ROI")}</th>
                </tr>
              </thead>
              <tbody>
                {data?.variants.map((r: ApiRecord) => (
                  <tr key={r.key}>
                    <td>{translateText(r.key)}</td>
                    <td>{translateText(fmt(r.impressions))}</td>
                    <td>
                      {translateText((r.conversion * 100).toFixed(2))}
                      {translateText("%")}
                    </td>
                    <td>{translateText(percent(r.roi))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            {translateText(
              "Variant A / B exposure is assigned deterministically by physical screen. Historical records are seeded; current-day interactions use persisted events.",
            )}
          </p>
        </div>
      </div>
    </Panel>
  );
}

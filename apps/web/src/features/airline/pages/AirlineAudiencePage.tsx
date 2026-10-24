import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import {
  BarChart3,
  Monitor,
  Plane,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { Empty } from "../../../shared/components/EmptyState";
import { SegmentBars } from "../../../shared/components/AudienceSegments";
import { api } from "../../../shared/api/client";
import { fmt, money, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function AirlineAudience(context: WorkspaceContext) {
  const [data, setData] = useState<ApiRecord | null>(null);
  useEffect(() => {
    api("/analytics/airline?airlineId=" + context.airline).then(setData);
  }, [context.airline, context.state.clock.sequence]);
  if (!data) return <Empty text="Loading your airline's aggregate audience…" />;
  return (
    <>
      <div className="kpi-grid">
        <KPI
          label={translateText("Passengers")}
          value={fmt(data.passengers)}
          sub={translateText("Own airline flights only")}
          icon={Users}
        />
        <KPI
          label={translateText("Est. gate impressions")}
          value={fmt(data.estimatedGateImpressions)}
          sub={translateText("Flight-share weighted exposure")}
          icon={Monitor}
        />
        <KPI
          label={translateText("Own-offer redemptions")}
          value={fmt(data.ownCampaignMetrics.redemptions)}
          sub={translateText("Validated airline campaign offer use")}
          icon={Ticket}
        />
        <KPI
          label={translateText("Own-offer revenue")}
          value={money(data.ownCampaignMetrics.revenue)}
          sub={translateText("Simulated commercial attribution")}
          icon={BarChart3}
        />
      </div>
      <div className="two-columns">
        <Panel title={translateText("Your airline's estimated audience")}>
          <SegmentBars presence={{ segments: data.segments }} />
          <p className="footnote">
            {translateText(
              "All-day passenger-weighted profiles for the selected airline, no individual records.",
            )}
          </p>
        </Panel>
        <Panel title={translateText("Destination connections")}>
          <div className="destination-list">
            {data.destinations.map((d: string) => (
              <span key={d}>
                <Plane size={14} />
                {translateText(d)}
              </span>
            ))}
          </div>
          <div className="ai-note">
            <ShieldCheck size={17} />
            <p>
              {translateText(
                "Gate impressions allocate stored screen exposure in proportion to the airline's supporting flight passenger totals. These remain model estimates.",
              )}
            </p>
          </div>
        </Panel>
      </div>
      <Panel title={translateText("Ranked partner fit")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Partner")}</th>
                <th>{translateText("Offer")}</th>
                <th>{translateText("Weighted fit")}</th>
              </tr>
            </thead>
            <tbody>
              {context.state.campaigns
                .filter(
                  (c: ApiRecord) => !c.airlineId && c.status === "approved",
                )
                .map((c: ApiRecord) => ({
                  ...c,
                  fit:
                    Object.entries(c.weights).reduce(
                      (n, [k, w]) =>
                        n + (data.segments[k] || 0) * (w as number),
                      0,
                    ) /
                    ((Object.values(c.weights).reduce(
                      (n: any, w: any) => n + w,
                      0,
                    ) as number) || 1),
                }))
                .sort((a: ApiRecord, b: ApiRecord) => b.fit - a.fit)
                .slice(0, 5)
                .map((c: ApiRecord) => (
                  <tr key={c.id}>
                    <td>
                      {translateText(
                        context.state.outlets.find(
                          (o: ApiRecord) => o.id === c.outletId,
                        )?.name,
                      )}
                    </td>
                    <td>{translateText(c.offer)}</td>
                    <td>{translateText(percent(c.fit))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

import { SegmentPerformance } from "../../analytics/components/SegmentPerformance";
import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Plane,
  Plus,
  ShoppingBag,
  Ticket,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { SegmentBars } from "../../../shared/components/AudienceSegments";
import { FlowChart } from "../../../shared/components/PassengerForecast";
import { CampaignTable } from "../../campaigns/components/CampaignTable";
import { Recommendations } from "../../inventory/components/SlotRecommendations";
import { api } from "../../../shared/api/client";
import { fmt, money, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function RetailOverview(context: WorkspaceContext) {
  const { state, org } = context;
  const [metrics, setMetrics] = useState<ApiRecord>({});
  useEffect(() => {
    api("/analytics/retailer?outletId=" + org).then(setMetrics);
  }, [org, state.clock.sequence]);
  const outlet = state.outlets.find((o: ApiRecord) => o.id === org);
  if (!outlet)
    return (
      <Panel title={translateText("Outlet unavailable")}>
        <p>{translateText(translateText("Select an existing outlet."))}</p>
      </Panel>
    );
  const p = state.presence[outlet.zoneId];
  return (
    <>
      <div className="retail-hero">
        <div>
          <span className="eyebrow">
            {translateText("YOUR NEXT OPPORTUNITY")}
          </span>
          <h2>
            {translateText("More time at the gate.")}
            <br />
            {translateText("More moments in store.")}
          </h2>
          <p>
            {translateText(
              p.delay >= 30
                ? `${p.count} estimated passengers nearby, with ${p.dwell} minutes to explore.`
                : "Your airport audience, connected to every campaign.",
            )}
          </p>
          <button onClick={() => context.setModal({ type: "campaign" })}>
            {translateText("Build a relevant moment")}
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="hero-orb">
          <ShoppingBag size={65} strokeWidth={0.8} />
          <span>{translateText(outlet.name)}</span>
          <small>
            {translateText(
              state.zones.find((z: ApiRecord) => z.id === outlet.zoneId)?.name,
            )}
          </small>
        </div>
      </div>
      <div className="kpi-grid five">
        <KPI
          label={translateText("Est. impressions")}
          value={fmt(metrics.impressions)}
          sub={translateText("Today \u00B7 delivered exposure")}
          icon={Users}
        />
        <KPI
          label={translateText("QR scans")}
          value={fmt(metrics.scans)}
          sub={`${fmt(metrics.claims)} offers claimed`}
          icon={Ticket}
        />
        <KPI
          label={translateText("Redemptions")}
          value={fmt(metrics.redemptions)}
          sub={translateText("Validated offer use")}
          icon={CheckCircle2}
        />
        <KPI
          label={translateText("Conversion rate")}
          value={percent(metrics.conversion)}
          sub={translateText("Redemptions / impressions")}
          icon={BarChart3}
        />
        <KPI
          label={translateText("Attributed revenue")}
          value={money(metrics.revenue, state.config.currency)}
          sub={translateText("Mock transaction \u00D7 24")}
          icon={ShoppingBag}
        />
      </div>
      <div className="overview-grid">
        <Panel
          title={translateText("Passenger flow near your store")}
          tag={translateText("NEXT 2 HOURS")}
        >
          <div className="flow-head">
            <b>
              {translateText(fmt(p.next30))}
              <small>{translateText(" expected next 30 min")}</small>
            </b>
            <span>
              {translateText(percent(p.segments.international))}
              {translateText(" international")}
            </span>
          </div>
          <FlowChart presence={p} />
          <div className="destination-list">
            {p.destinations.map((d: string) => (
              <span key={d}>
                <Plane size={14} />
                {translateText(d)}
              </span>
            ))}
          </div>
        </Panel>
        <Panel title={translateText("Your audience, right now")}>
          <SegmentBars presence={p} />
          <p className="footnote">
            {translateText("Nationality: ")}
            {translateText(p.nationalities.join(" · "))}
            {translateText(
              ". Heuristic shares, not observed personal attributes.",
            )}
          </p>
        </Panel>
      </div>
      <Panel
        title={translateText("Live campaigns")}
        actions={
          <button
            className="text-button"
            onClick={() => context.setModal({ type: "campaign" })}
          >
            {translateText("New campaign")}
            <Plus size={14} />
          </button>
        }
      >
        <CampaignTable {...context} limit={4} />
      </Panel>
      <Recommendations {...context} />
      <SegmentPerformance {...context} />
    </>
  );
}

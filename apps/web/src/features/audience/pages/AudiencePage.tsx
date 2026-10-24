import { translateText } from "../../../i18n/index";
import { useState } from "react";
import { Clock3, Plane, ShieldCheck, Users } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { SegmentBars } from "../../../shared/components/AudienceSegments";
import { FlowChart } from "../../../shared/components/PassengerForecast";
import { fmt, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Audience(context: WorkspaceContext) {
  const [zone, setZone] = useState("Z7");
  const p = context.state.presence[zone];
  return (
    <>
      <div className="toolbar">
        <select
          aria-label={translateText("Audience zone")}
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {context.state.zones.map((z: ApiRecord) => (
            <option key={z.id} value={z.id}>
              {translateText(z.name)}
            </option>
          ))}
        </select>
        <span className="badge neutral">
          {translateText("Aggregate estimates \u00B7 no individual tracking")}
        </span>
      </div>
      <div className="kpi-grid">
        <KPI
          label={translateText("Present now")}
          value={fmt(p.count)}
          sub={translateText("Nearby gates + queue attenuation")}
          icon={Users}
        />
        <KPI
          label={translateText("Next 30 minutes")}
          value={fmt(p.next30)}
          sub={translateText("Expected departure catchment")}
          icon={Plane}
        />
        <KPI
          label={translateText("Estimated dwell")}
          value={p.dwell + " min"}
          sub={`${p.delay} min delay exposure`}
          icon={Clock3}
        />
        <KPI
          label={translateText("Confidence")}
          value={percent(p.confidence)}
          sub={p.modelVersion}
          icon={ShieldCheck}
        />
      </div>
      <div className="two-columns">
        <Panel title={translateText("Passenger flow \u00B7 next two hours")}>
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
        <Panel title={translateText("Estimated segment mix")}>
          <SegmentBars presence={p} />
        </Panel>
        <Panel title={translateText("Audience context")}>
          <div className="detail-grid">
            <span>
              {translateText("Party type")}
              <b>
                {translateText("Couple ")}
                {translateText(percent(p.segments.couple))}
                {translateText(" \u00B7 solo")}
                {translateText(" ")}
                {translateText(percent(p.segments.solo))}
              </b>
            </span>
            <span>
              {translateText("Cabin / spend tier")}
              <b>
                {translateText("Premium ")}
                {translateText(percent(p.segments.premium))}
              </b>
            </span>
            <span>
              {translateText("Frequent flyer")}
              <b>{translateText(percent(p.segments.frequentFlyer))}</b>
            </span>
            <span>
              {translateText("Top nationalities")}
              <b>{translateText(p.nationalities.join(" · "))}</b>
            </span>
            <span>
              {translateText("Languages")}
              <b>{translateText(p.languages.join(" · "))}</b>
            </span>
            <span>
              {translateText("Age bands")}
              <b>
                {translateText(
                  Object.entries(p.age)
                    .map(([k, v]) => `${k}: ${percent(v as number)}`)
                    .join(" / "),
                )}
              </b>
            </span>
          </div>
        </Panel>
        <Panel title={translateText("Provenance & calculation")}>
          <div className="detail-grid">
            <span>
              {translateText("Window")}
              <b>{translateText(p.window)}</b>
            </span>
            <span>
              {translateText("Supporting flights")}
              <b>
                {translateText(
                  p.flightIds.slice(0, 8).join(", ") || "None in this window",
                )}
              </b>
            </span>
            <span>
              {translateText("Queue measurements")}
              <b>{translateText(p.queueIds.join(", "))}</b>
            </span>
            <span>
              {translateText("Method")}
              <b>
                {translateText(
                  "Passenger count \u00D7 time-to-boarding \u00D7 gate catchment \u00D7 queue attenuation",
                )}
              </b>
            </span>
          </div>
          <details>
            <summary>
              {translateText("Source references & original timestamps")}
            </summary>
            <pre>{translateText(JSON.stringify(p.evidence, null, 2))}</pre>
          </details>
        </Panel>
      </div>
    </>
  );
}

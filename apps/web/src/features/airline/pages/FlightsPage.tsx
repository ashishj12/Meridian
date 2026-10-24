import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Clock3, Monitor, Plane, Ticket, Users } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { Badge } from "../../../shared/components/StatusBadge";
import { api } from "../../../shared/api/client";
import { fmt, time, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Flights(context: WorkspaceContext) {
  const [flights, setFlights] = useState<ApiRecord[]>([]);
  useEffect(() => {
    api(`/flights?airlineId=${context.airline}&limit=1000`).then((r) =>
      setFlights(r.items),
    );
  }, [context.airline, context.state.clock.sequence]);
  const list = flights
    .filter((f) => f.direction === "D")
    .sort(
      (a, b) =>
        Number(b.id === "XY501") - Number(a.id === "XY501") ||
        Date.parse(a.estimated) - Date.parse(b.estimated),
    );
  return (
    <>
      <div className="kpi-grid">
        <KPI
          label={translateText("Departures today")}
          value={list.length}
          sub={translateText("Canonical AODB schedule")}
          icon={Plane}
        />
        <KPI
          label={translateText("Delayed flights")}
          value={list.filter((f) => f.delay > 0).length}
          sub={translateText("Live AIDX changes")}
          icon={Clock3}
        />
        <KPI
          label={translateText("Passengers")}
          value={fmt(list.reduce((n, f) => n + f.pax, 0))}
          sub={translateText("Aggregated by flight")}
          icon={Users}
        />
        <KPI
          label={translateText("Goodwill offers")}
          value={
            context.state.campaigns.filter(
              (c: ApiRecord) => c.airlineId === context.airline,
            ).length
          }
          sub={translateText("Threshold-triggered campaigns")}
          icon={Ticket}
        />
      </div>
      <Panel
        title={translateText("Today's flight timeline")}
        tag={translateText("LIVE")}
      >
        <div className="flight-timeline">
          {list.slice(0, 12).map((f) => (
            <div
              key={f.id}
              style={{
                left: `${Math.max(0, Math.min(94, ((Date.parse(f.estimated) - Date.parse("2026-10-14T00:00:00Z")) / 86400000) * 100))}%`,
              }}
              title={`${f.number} ${time(f.estimated)}`}
            >
              <Plane size={14} />
              <small>{translateText(f.number)}</small>
            </div>
          ))}
          <span>{translateText("00:00")}</span>
          <span>{translateText("06:00")}</span>
          <span>{translateText("12:00")}</span>
          <span>{translateText("18:00")}</span>
          <span>{translateText("24:00")}</span>
        </div>
      </Panel>
      <Panel
        title={translateText("Flight movements")}
        actions={
          <button
            onClick={() =>
              context.setModal({ type: "campaign", messaging: true })
            }
          >
            <Monitor size={14} />
            {translateText("Schedule gate message")}
          </button>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Flight / destination")}</th>
                <th>{translateText("Gate")}</th>
                <th>{translateText("Scheduled")}</th>
                <th>{translateText("Estimated")}</th>
                <th>{translateText("Status")}</th>
                <th>{translateText("Delay")}</th>
                <th>{translateText("Aircraft / load")}</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 50).map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>
                      {translateText(f.number)}
                      {translateText(" \u2192 ")}
                      {translateText(f.destination)}
                    </b>
                    <small>
                      {translateText(
                        f.international ? "International" : "Domestic",
                      )}
                      {translateText(" \u00B7 ")}
                      {translateText(f.pax)}
                      {translateText(" ")}
                      {translateText("passengers")}
                    </small>
                  </td>
                  <td>{translateText(f.gate)}</td>
                  <td>{translateText(time(f.scheduled))}</td>
                  <td>{translateText(time(f.estimated))}</td>
                  <td>
                    <Badge value={f.status} />
                  </td>
                  <td>{translateText(f.delay ? `+${f.delay}m` : "—")}</td>
                  <td>
                    {translateText(f.aircraft)}
                    {translateText(" \u00B7 ")}
                    {translateText(percent(f.pax / f.seats))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

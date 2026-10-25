import { translateText } from "../../../i18n/index";
import { useState, useEffect, useRef } from "react";
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
  const [timelineViewport, setTimelineViewport] = useState(window.innerWidth);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    api(`/flights?airlineId=${context.airline}&limit=1000`).then((r) =>
      setFlights(r.items),
    );
  }, [context.airline, context.state.clock.sequence]);
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const updateViewport = () => setTimelineViewport(window.innerWidth);
    const observer = new ResizeObserver((entries) => {
      setTimelineWidth(entries[0].contentRect.width);
    });
    observer.observe(timeline);
    window.addEventListener("resize", updateViewport);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, []);
  const list = flights
    .filter((f) => f.direction === "D")
    .sort(
      (a, b) =>
        Number(b.id === "XY501") - Number(a.id === "XY501") ||
        Date.parse(a.estimated) - Date.parse(b.estimated),
    );
  const markerEdge = timelineViewport <= 600 ? 12 : 28;
  const markerWidth = markerEdge * 2;
  const laneGap =
    timelineWidth > 0 ? ((markerWidth + 8) / timelineWidth) * 100 : 10;
  const timelineClusters: { flights: ApiRecord[]; position: number }[] = [];
  list
    .slice(0, 12)
    .sort((a, b) => Date.parse(a.estimated) - Date.parse(b.estimated))
    .forEach((flight) => {
      const rawPosition = Math.max(
        0,
        Math.min(
          100,
          ((Date.parse(flight.estimated) - Date.parse("2026-10-14T00:00:00Z")) /
            86400000) *
            100,
        ),
      );
      const edgePercent =
        timelineWidth > 0 ? (markerEdge / timelineWidth) * 100 : 0;
      const position = Math.max(
        edgePercent,
        Math.min(100 - edgePercent, rawPosition),
      );
      const previous = timelineClusters[timelineClusters.length - 1];
      if (previous && position - previous.position < laneGap) {
        previous.flights.push(flight);
        previous.position =
          (previous.position * (previous.flights.length - 1) + position) /
          previous.flights.length;
      } else {
        timelineClusters.push({ flights: [flight], position });
      }
    });
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
        <div ref={timelineRef} className="flight-timeline">
          {timelineClusters.map((cluster) => (
            <div
              key={cluster.flights[0].id}
              className={cluster.flights.length > 1 ? "clustered" : "single"}
              role="img"
              aria-label={cluster.flights
                .map((flight) => `${flight.number} ${time(flight.estimated)}`)
                .join(", ")}
              title={cluster.flights
                .map((flight) => `${flight.number} ${time(flight.estimated)}`)
                .join(", ")}
              style={{
                left: `${cluster.position}%`,
                transform: "translateX(-50%)",
              }}
            >
              <Plane size={14} />
              <small>
                {cluster.flights.length > 1
                  ? cluster.flights.length
                  : translateText(cluster.flights[0].number)}
              </small>
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

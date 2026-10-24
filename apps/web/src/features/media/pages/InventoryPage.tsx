import { SegmentHeatmap } from "../components/SegmentHeatmap";
import { translateText } from "../../../i18n/index";
import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client";
import {
  BarChart3,
  Check,
  Monitor,
  Users,
  CalendarDays,
  Package,
} from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { Recommendations } from "../../inventory/components/SlotRecommendations";
import { fmt, money, time, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Inventory(context: WorkspaceContext) {
  const [page, setPage] = useState(0);
  const [campaign, setCampaign] = useState("C1");
  const [zone, setZone] = useState("All");
  const screens = context.state.screens.filter(
    (state: ApiRecord) => zone === "All" || state.zoneId === zone,
  );
  const tomorrow =
    Math.floor(context.state.clock.time / 86400000) * 86400000 + 86400000;
  const bookings = context.state.bookings;
  const [yieldForecast, setYieldForecast] = useState<ApiRecord>({});
  useEffect(() => {
    let active = true;
    api("/analytics/yield")
      .then((result) => {
        if (active) setYieldForecast(result);
      })
      .catch((error) => context.notify(error.message));
    return () => {
      active = false;
    };
  }, [context.state.clock.sequence]);
  return (
    <>
      <div className="kpi-grid">
        <KPI
          label={translateText("Booked inventory")}
          value={percent(bookings.length / (180 * 24))}
          sub={`${bookings.length} reserved screen-hours`}
          icon={CalendarDays}
        />
        <KPI
          label={translateText("Available screens")}
          value={
            context.state.screens.filter(
              (state: ApiRecord) => state.status !== "offline",
            ).length
          }
          sub={translateText("Live network health")}
          icon={Monitor}
        />
        <KPI
          label={translateText("7-day revenue forecast")}
          value={money(
            yieldForecast.revenueForecast || 0,
            context.state.config.currency,
          )}
          sub={
            translateText("Committed ") +
            money(
              yieldForecast.committedRevenue || 0,
              context.state.config.currency,
            ) +
            " · " +
            Math.round((yieldForecast.expectedFillRate || 0) * 100) +
            "%"
          }
          icon={BarChart3}
        />
        <KPI
          label={translateText("Premium catchment")}
          value={fmt(context.state.presence.Z7.count)}
          sub={translateText("Gate 42 estimated presence")}
          icon={Users}
        />
      </div>
      <Panel
        title={
          translateText("Screen inventory") +
          " · " +
          new Date(tomorrow).toLocaleDateString(
            context.lang === "hi" ? "hi-IN" : "en-GB",
            { day: "numeric", month: "long", timeZone: "UTC" },
          )
        }
        tag={translateText("TOMORROW")}
        actions={
          <div className="row-actions">
            <select
              aria-label={translateText("Inventory zone")}
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setPage(0);
              }}
            >
              <option value="All">{translateText("All")}</option>
              {context.state.zones.map((z: ApiRecord) => (
                <option key={z.id} value={z.id}>
                  {translateText(z.name)}
                </option>
              ))}
            </select>
            <select
              aria-label={translateText("Booking campaign")}
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              {context.state.campaigns.map((c: ApiRecord) => (
                <option key={c.id} value={c.id}>
                  {translateText(c.name)}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="inventory-legend">
          <span>
            <i className="slot booked" />
            {translateText("Booked")}
          </span>
          <span>
            <i className="slot premium" />
            {translateText("Premium \u00B7 high estimated presence")}
          </span>
          <span>
            <i className="slot" />
            {translateText("Available \u00B7 click to reserve")}
          </span>
        </div>
        <div className="table-wrap calendar">
          <table>
            <thead>
              <tr>
                <th>{translateText("Screen / gate")}</th>
                {translateText(
                  Array.from({ length: 24 }, (_, h) => (
                    <th key={h}>{translateText(String(h).padStart(2, "0"))}</th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {screens
                .slice(page * 15, page * 15 + 15)
                .map((state: ApiRecord) => (
                  <tr key={state.id}>
                    <td>
                      <b>{translateText(state.id)}</b>
                      <small>
                        {translateText("Gate ")}
                        {translateText(state.gate)}
                        {translateText(" \u00B7 ")}
                        {translateText(state.zoneId)}
                      </small>
                    </td>
                    {translateText(
                      Array.from({ length: 24 }, (_, h) => {
                        const timestamp = tomorrow + h * 3600000;
                        const booked = bookings.find(
                          (b: ApiRecord) =>
                            b.screenId === state.id &&
                            b.timestamp === timestamp,
                        );
                        const premium =
                          context.state.presence[state.zoneId].count > 300 &&
                          h >= 12 &&
                          h <= 18;
                        const price =
                          1.5 +
                          context.state.presence[state.zoneId].count / 300;
                        return (
                          <td key={h}>
                            <button
                              aria-label={`${state.id} ${h}:00 ${booked ? "booked" : "available"}`}
                              disabled={!!booked || state.status === "offline"}
                              title={`${booked ? "Booked" : premium ? "Premium" : "Available"} · ${money(price)} · ${context.state.presence[state.zoneId].count} est. pax`}
                              className={`slot ${booked ? "booked" : premium ? "premium" : ""}`}
                              onClick={() =>
                                context
                                  .action("/inventory/book", {
                                    screenId: state.id,
                                    campaignId: campaign,
                                    timestamp,
                                  })
                                  .then(() =>
                                    context.notify(
                                      "Inventory reserved. Duplicate booking is prevented.",
                                    ),
                                  )
                              }
                            >
                              {translateText(booked ? <Check size={11} /> : "")}
                            </button>
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {translateText(screens.length)}
            {translateText(" screens \u00B7 Page ")}
            {translateText(page + 1)}
          </span>
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            {translateText("Previous")}
          </button>
          <button
            disabled={(page + 1) * 15 >= screens.length}
            onClick={() => setPage(page + 1)}
          >
            {translateText("Next")}
          </button>
          <button
            onClick={() =>
              context.setModal({ type: "entity", kind: "packages" })
            }
          >
            <Package size={14} />
            {translateText("Create premium package")}
          </button>
        </div>
      </Panel>
      <Recommendations {...context} />
      <SegmentHeatmap {...context} />
    </>
  );
}

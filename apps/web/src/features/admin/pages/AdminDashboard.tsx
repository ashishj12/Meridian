import { translateText } from "../../../i18n/index";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  Clock3,
  Globe2,
  Layers3,
  Monitor,
  Plane,
  Play,
  Radio,
  Sparkles,
  Users,
  AlertTriangle,
} from "lucide-react";
import AdminNetwork from "../AdminNetwork";
import { Panel } from "../../../shared/components/Panel";
import { KPI } from "../../../shared/components/KpiCard";
import { Badge } from "../../../shared/components/StatusBadge";
import { SegmentBars } from "../../../shared/components/AudienceSegments";
import { fmt, money, time, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function AdminOverview(context: WorkspaceContext) {
  const { state, setModal, search, terminal, setTerminal, setPage } = context;
  const screens = state.screens;
  const online = screens.filter((a: ApiRecord) => a.status === "online").length;
  const active = state.campaigns.filter(
    (c: ApiRecord) => c.status === "approved" && !c.paused,
  ).length;
  return (
    <div className="admin-overview">
      {translateText(
        state.incidents.some((i: ApiRecord) => i.status !== "resolved") && (
          <div className="admin-attention">
            <span className="attention-icon">
              <AlertTriangle size={18} />
            </span>
            <div>
              <b>
                {translateText(
                  state.incidents.filter(
                    (i: ApiRecord) => i.status !== "resolved",
                  ).length,
                )}
                {translateText(" ")}
                {translateText("open incident")}
                {translateText(
                  state.incidents.filter(
                    (i: ApiRecord) => i.status !== "resolved",
                  ).length === 1
                    ? ""
                    : "s",
                )}
              </b>
              <span>
                {translateText(
                  state.incidents.find(
                    (i: ApiRecord) => i.status !== "resolved",
                  )?.title,
                )}
              </span>
            </div>
            <button onClick={() => setPage("incidents")}>
              {translateText("Review incidents ")}
              <ArrowRight size={16} />
            </button>
          </div>
        ),
      )}

      <div className="kpi-grid six">
        <KPI
          label={translateText("Screens online")}
          value={percent(online / screens.length)}
          sub={`${online} of ${screens.length} screens`}
          icon={Monitor}
          tone="green"
        />
        <KPI
          label={translateText("Ad plays today")}
          value={fmt(state.metrics.plays)}
          sub={translateText("Delivered display events")}
          icon={Play}
        />
        <KPI
          label={translateText("Estimated impressions")}
          value={fmt(state.metrics.impressions)}
          sub={translateText("Aggregate audience exposure")}
          icon={Users}
        />
        <KPI
          label={translateText("Revenue today")}
          value={money(state.metrics.spend, state.config.currency)}
          sub={translateText("Served media value")}
          icon={BarChart3}
          tone="green"
        />
        <KPI
          label={translateText("Active campaigns")}
          value={active}
          sub={`${state.campaigns.length} campaigns in workspace`}
          icon={Layers3}
        />
        <KPI
          label={translateText("Avg. screen latency")}
          value={`${Math.round(screens.reduce((a: number, x: ApiRecord) => a + x.latency, 0) / screens.length)} ms`}
          sub={translateText("Seeded player telemetry")}
          icon={Activity}
        />
      </div>
      <div className="overview-grid">
        <Panel
          title={translateText("Airport network")}
          tag={translateText("LIVE")}
          actions={
            <div className="segmented">
              {["All", "T1", "T2"].map((v) => (
                <button
                  key={v}
                  className={terminal === v ? "active" : ""}
                  onClick={() => setTerminal(v)}
                >
                  {translateText(v === "All" ? "All terminals" : v)}
                </button>
              ))}
            </div>
          }
          className="map-panel"
        >
          <div className="map-toolbar">
            <div>
              <span className="dot green" />
              {translateText("Online ")}
              <span className="dot amber" />
              {translateText("Degraded ")}
              <span className="dot red" />
              {translateText("Offline")}
            </div>
            <span>
              <Layers3 size={13} />
              {translateText("Estimated passenger density")}
            </span>
          </div>
          <AdminNetwork
            state={state}
            terminal={terminal}
            query={search}
            onSelect={(id: string) => setModal({ type: "screen", id })}
          />
          <div className="map-bottom">
            <span>
              <span className="dot blue" />
              {translateText("Gate 42 \u00B7 Live decision catchment")}
            </span>
            <div>
              {translateText("Low ")}
              <i className="heat-scale" />
              {translateText(" High")}
            </div>
            <span>
              {translateText("Click a screen to inspect ")}
              <ArrowUpRight size={12} />
            </span>
          </div>
        </Panel>
        <Panel
          title={translateText("Intelligence pulse")}
          actions={
            <span className="violet icon-surface">
              <Sparkles size={15} />
            </span>
          }
          className="pulse-panel"
        >
          <div className="pulse-highlight">
            <span className="tiny-tag violet">
              {translateText("GATE 42 \u00B7 ESTIMATED")}
            </span>
            <h3>
              {translateText(fmt(state.presence.Z7.count))}
              <small>{translateText("passengers in catchment")}</small>
            </h3>
            <div className="pulse-mini">
              <span>
                <Clock3 size={14} />
                {translateText(state.presence.Z7.dwell)}
                {translateText(" min dwell")}
              </span>
              <span>
                <Globe2 size={14} />
                {translateText(
                  percent(state.presence.Z7.segments.international),
                )}
                {translateText(" intl.")}
              </span>
            </div>
          </div>
          <div className="pulse-caption">
            {translateText("THE CROWD RIGHT NOW")}
          </div>
          <SegmentBars presence={state.presence.Z7} />
          <div className="ai-note">
            <Sparkles size={16} />
            <p>
              {translateText(
                state.presence.Z7.delay >= 30
                  ? "A verified delay has extended dwell. Fragrance campaign is eligible for the delay boost."
                  : "XY501 is on schedule. Inject a delay to see the audience and screen decision change.",
              )}
            </p>
          </div>
          <button
            className="text-button"
            onClick={() => setModal({ type: "screen", id: "S124" })}
          >
            {translateText("Explore the decision")}
            <ArrowRight size={14} />
          </button>
        </Panel>
      </div>
      <div className="bottom-grid">
        <Panel
          title={translateText("Live operations")}
          actions={
            <span className="live-label">
              <span className="dot green" />
              {translateText("Shared event stream")}
            </span>
          }
        >
          <div className="activity-list">
            {state.incidents
              .slice(-2)
              .reverse()
              .map((i: ApiRecord) => (
                <div className="activity-row" key={i.id}>
                  <span className="event-icon amber">
                    <AlertTriangle size={16} />
                  </span>
                  <div>
                    <b>{translateText(i.title)}</b>
                    <small>
                      {translateText(i.owner)}
                      {translateText(" \u00B7")}
                      {translateText(i.severity)}
                      {translateText(" priority")}
                    </small>
                  </div>
                  <span className="mono">
                    {translateText(time(i.timestamp))}
                  </span>
                </div>
              ))}
            <div className="activity-row">
              <span className="event-icon blue">
                <Plane size={16} />
              </span>
              <div>
                <b>
                  {translateText("XY501 \u00B7 ")}
                  {translateText(
                    state.flights.find((f: ApiRecord) => f.id === "XY501")
                      ?.status,
                  )}
                </b>
                <small>
                  {translateText("Gate ")}
                  {translateText(
                    state.flights.find((f: ApiRecord) => f.id === "XY501")
                      ?.gate,
                  )}
                  {translateText(" \u00B7")}
                  {translateText(" ")}
                  {translateText(state.presence.Z7.delay)}
                  {translateText("m delay \u00B7 AIDX feed")}
                </small>
              </div>
              <span className="mono">
                {translateText(time(state.clock.time))}
              </span>
            </div>
            <div className="activity-row">
              <span className="event-icon violet">
                <Sparkles size={16} />
              </span>
              <div>
                <b>
                  {translateText(
                    state.decision?.campaignId
                      ? state.campaigns.find(
                          (c: ApiRecord) => c.id === state.decision.campaignId,
                        )?.name
                      : "Airport information fallback",
                  )}
                </b>
                <small>
                  {translateText("Screen S124 \u00B7 ")}
                  {translateText(state.decision?.modelVersion)}
                  {translateText(" \u00B7 evidence")}
                  {translateText(" ")}
                  {translateText(state.decision?.evidenceMode)}
                </small>
              </div>
              <span className="mono">
                {translateText(time(state.decision?.timestamp))}
              </span>
            </div>
          </div>
        </Panel>
        <Panel
          title={translateText("Data feed health")}
          actions={
            <span className="subtle">{translateText("3 adapters")}</span>
          }
        >
          <div className="feed-list">
            {state.feeds.map((f: ApiRecord) => (
              <div className="feed-row" key={f.name}>
                <span className="feed-icon">
                  <Radio size={17} />
                </span>
                <div>
                  <b>
                    {translateText(f.name)}
                    <small>{translateText(f.adapter)}</small>
                  </b>
                  <span>
                    {translateText(f.messagesPerMinute)}
                    {translateText(" msg/min \u00B7 last ")}
                    {translateText(time(f.lastUpdate))}
                  </span>
                </div>
                <Badge value={f.status} />
              </div>
            ))}
          </div>
          <div className="performance-strip">
            <span>
              {translateText("API p95 ")}
              <b>
                {translateText(state.performance.apiP95)}
                {translateText(" ms")}
              </b>
            </span>
            <span>
              {translateText("Playlist build ")}
              <b>
                {translateText(state.performance.playlistMs)}
                {translateText(" ms")}
              </b>
            </span>
            <span>
              {translateText("7d uptime ")}
              <b>
                {translateText(state.performance.uptime)}
                {translateText("%*")}
              </b>
            </span>
          </div>
          <small className="footnote">
            {translateText(
              "*Seeded demonstration telemetry; build/API durations measured locally.",
            )}
          </small>
        </Panel>
      </div>
    </div>
  );
}

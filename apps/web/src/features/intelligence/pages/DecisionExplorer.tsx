import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { DecisionPanel } from "../components/DecisionEvidence";
import { api } from "../../../shared/api/client";
import { time } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Intelligence(context: WorkspaceContext) {
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<ApiRecord[]>([]);
  const [selected, setSelected] = useState<ApiRecord | null>(null);
  const [exploration, setExploration] = useState(
    context.state.config.exploration,
  );
  const [cap, setCap] = useState(context.state.config.frequencyCap);
  useEffect(() => {
    api("/decisions?q=" + encodeURIComponent(q)).then(setLogs);
  }, [q, context.state.clock.sequence]);
  return (
    <>
      <div className="two-columns">
        <Panel
          title={translateText("Deterministic rule configuration")}
          tag={translateText("RULES-1.0")}
        >
          <div className="form-grid">
            <label>
              {translateText("Exploration rate")}
              <input
                type="number"
                min="0"
                max="0.2"
                step="0.01"
                value={exploration}
                onChange={(e) => setExploration(+e.target.value)}
              />
            </label>
            <label>
              {translateText("Frequency cap / screen / day")}
              <input
                type="number"
                value={cap}
                onChange={(e) => setCap(+e.target.value)}
              />
            </label>
            <label>
              {translateText("Competitor separation")}
              <select
                value={String(context.state.config.competitorSeparation)}
                onChange={(e) =>
                  context.action(
                    "/config",
                    { competitorSeparation: e.target.value === "true" },
                    "PATCH",
                  )
                }
              >
                <option value="true">{translateText("Enabled")}</option>
                <option value="false">{translateText("Disabled")}</option>
              </select>
            </label>
            <label>
              {translateText("Reporting currency")}
              <select
                value={context.state.config.currency}
                onChange={(e) =>
                  context.action(
                    "/config",
                    { currency: e.target.value },
                    "PATCH",
                  )
                }
              >
                {["USD", "INR", "EUR", "GBP"].map((c) => (
                  <option key={c} value={c}>
                    {translateText(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="primary"
            onClick={() =>
              context
                .action("/config", { exploration, frequencyCap: cap }, "PATCH")
                .then(() =>
                  context.notify(
                    "Rules saved. Eligible screen decisions recalculated.",
                  ),
                )
            }
          >
            {translateText("Save rules")}
          </button>
          <p className="footnote">
            {translateText(
              "Model presence-1.0 / score-1.0. Exploration is bounded and deterministic; evidence validation has final authority.",
            )}
          </p>
        </Panel>
        <Panel title={translateText("Evidence validation lab")}>
          <p className="muted">
            {translateText(
              "Reproduce safe fallback when a proposed choice lacks trusted evidence.",
            )}
          </p>
          <div className="evidence-buttons">
            {["fresh", "stale", "missing", "contradictory", "unverifiable"].map(
              (mode) => (
                <button
                  key={mode}
                  className={
                    context.state.clock.evidenceMode === mode ? "primary" : ""
                  }
                  onClick={() =>
                    context.action("/simulation/events", {
                      type: "evidence",
                      mode,
                    })
                  }
                >
                  {translateText(mode)}
                </button>
              ),
            )}
          </div>
          <div className="ai-note">
            <ShieldCheck size={18} />
            <p>{translateText(context.state.decision.reason)}</p>
          </div>
          <button onClick={() => context.setModal({ type: "override" })}>
            <SlidersHorizontal size={14} />
            {translateText("Pin a campaign with an audit reason")}
          </button>
        </Panel>
      </div>
      <Panel
        title={translateText("Decision explorer")}
        tag={translateText("EVIDENCE FIRST")}
        actions={
          <div className="search-field">
            <Search size={14} />
            <input
              aria-label={translateText("Search decisions")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={translateText(
                "Screen, campaign, rule or evidence\u2026",
              )}
            />
          </div>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Slot")}</th>
                <th>{translateText("Screen")}</th>
                <th>{translateText("Selected campaign")}</th>
                <th>{translateText("Audience")}</th>
                <th>{translateText("Validation")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 15).map((d) => (
                <tr key={d.id}>
                  <td className="mono">{translateText(time(d.timestamp))}</td>
                  <td>{translateText(d.screenId)}</td>
                  <td>
                    {translateText(
                      d.campaignId
                        ? context.state.campaigns.find(
                            (c: ApiRecord) => c.id === d.campaignId,
                          )?.name
                        : "Airport information",
                    )}
                  </td>
                  <td>
                    {translateText(d.presence.count)}
                    {translateText(" est.")}
                  </td>
                  <td>
                    <Badge value={d.validated ? "verified" : "fallback"} />
                  </td>
                  <td>
                    <button onClick={() => setSelected(d)}>
                      {translateText("Why this ad?")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && <DecisionPanel decision={selected} />}
    </>
  );
}

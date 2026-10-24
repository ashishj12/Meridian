import { translateText } from "../../i18n/index";
import { ChevronDown, Pause, Play, Radio, RefreshCw, Zap } from "lucide-react";
import { time } from "../../shared/lib/format";
import type { WorkspaceShellProps } from "../../shared/types/workspace";

/** SimulationBar renders shared navigation only; state changes are delegated to the application. */
export function SimulationBar(props: WorkspaceShellProps) {
  const { state, action, notify, setModal } = props;
  return (
    <div className="simulation">
      <div className="sim-label">
        <span className="sim-icon">
          <Radio size={15} />
        </span>
        <b>{translateText("Simulation")}</b>
        <span className="tiny-tag">{translateText("SANDBOX")}</span>
      </div>
      <div className="sim-controls">
        <button
          aria-label={
            state.clock.playing ? "Pause simulation" : "Play simulation"
          }
          className="play-button"
          onClick={() =>
            action("/simulation/control", {
              action: state.clock.playing ? "pause" : "play",
            })
          }
        >
          {translateText(
            state.clock.playing ? <Pause size={13} /> : <Play size={13} />,
          )}
        </button>
        <span className="sim-time">
          {translateText(time(state.clock.time))}
          <span>
            {translateText(":")}
            {translateText(
              new Date(state.clock.time)
                .getUTCSeconds()
                .toString()
                .padStart(2, "0"),
            )}
          </span>
        </span>
        <span className="sim-date">
          {translateText("14 OCT 2026 \u00B7 UTC")}
        </span>
        <div className="speed">
          {[1, 10, 60].map((v) => (
            <button
              key={v}
              className={state.clock.speed === v ? "active" : ""}
              onClick={() => action("/simulation/control", { speed: v })}
            >
              {translateText(v)}
              {translateText("\u00D7")}
            </button>
          ))}
        </div>
        <input
          aria-label={translateText("Jump to simulation time")}
          type="time"
          defaultValue="14:10"
          onBlur={(e) => {
            if (e.target.value)
              action("/simulation/control", {
                time: `2026-10-14T${e.target.value}:00Z`,
              });
          }}
        />
        <button
          aria-label={translateText("Reset scenario")}
          className="icon-button"
          onClick={() =>
            action("/simulation/control", { action: "reset" }).then(() =>
              notify("Scenario restored. Ready for the next demonstration."),
            )
          }
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="inject-controls">
        <button onClick={() => setModal({ type: "event" })}>
          <Zap size={14} />
          {translateText("Inject event")}
          <ChevronDown size={12} />
        </button>
        <button
          className="quick-delay"
          onClick={() =>
            action("/simulation/events", {
              type: "delay",
              flightId: "XY501",
              minutes: 45,
            }).then(() =>
              notify("XY501 delayed 45 minutes. Shared decisions updated."),
            )
          }
        >
          {translateText("+45m XY501")}
        </button>
      </div>
    </div>
  );
}

import { translateText } from "../../../i18n/index";
import { useState } from "react";
import { Zap } from "lucide-react";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function EventForm(
  context: WorkspaceContext & {
    close: () => void;
  },
) {
  const [type, setType] = useState("delay");
  const [flightId, setFlight] = useState("XY501");
  const [minutes, setMinutes] = useState(45);
  const [gate, setGate] = useState("48");
  const [screenId, setScreen] = useState("S124");
  const [error, setError] = useState("");
  return (
    <>
      <span className="eyebrow">{translateText("SIMULATION LAB")}</span>
      <h2>{translateText("One event. Every perspective.")}</h2>
      <p className="muted">
        {translateText(
          "Inject a canonical mock-AIDX event. Every connected role receives the same change.",
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await context.action("/simulation/events", {
              type,
              flightId,
              minutes,
              gate,
              screenId,
            });
            context.notify("Event injected. Airport decisions updated.");
            context.close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <label>
          {translateText("Event type")}
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "delay",
              "gate-change",
              "screen-offline",
              "boarding",
              "departure",
              "cancellation",
              "feed-lag",
              "creative-failure",
            ].map((v) => (
              <option key={v} value={v}>
                {translateText(v)}
              </option>
            ))}
          </select>
        </label>
        {translateText(
          type === "screen-offline" ? (
            <label>
              {translateText("Screen")}
              <select
                value={screenId}
                onChange={(e) => setScreen(e.target.value)}
              >
                {context.state.screens.map((state: ApiRecord) => (
                  <option key={state.id} value={state.id}>
                    {translateText(state.id)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              {translateText("Flight")}
              <input
                value={flightId}
                onChange={(e) => setFlight(e.target.value)}
              />
            </label>
          ),
        )}
        {translateText(
          type === "delay" && (
            <label>
              {translateText("Delay minutes")}
              <input
                type="number"
                min="0"
                max="1440"
                value={minutes}
                onChange={(e) => setMinutes(+e.target.value)}
              />
            </label>
          ),
        )}
        {translateText(
          type === "gate-change" && (
            <label>
              {translateText("New gate")}
              <input value={gate} onChange={(e) => setGate(e.target.value)} />
            </label>
          ),
        )}
        {error && <p className="form-error">{translateText(error)}</p>}
        <button type="submit" className="primary">
          <Zap size={15} />
          {translateText("Inject into shared simulation")}
        </button>
      </form>
    </>
  );
}

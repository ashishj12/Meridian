import { translateText } from "../../../i18n/index";
import { useState } from "react";
import { Monitor, Plane, Plus, Ticket } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { DecisionPanel } from "../../intelligence/components/DecisionEvidence";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Messaging(context: WorkspaceContext) {
  const airline = context.state.airlines.find(
    (a: ApiRecord) => a.id === context.airline,
  );
  const [threshold, setThreshold] = useState(airline?.goodwillThreshold || 30);
  if (!airline)
    return (
      <Panel title={translateText("Airline unavailable")}>
        <p>{translateText(translateText("Select an existing airline."))}</p>
      </Panel>
    );
  return (
    <>
      <div className="two-columns">
        <Panel title={translateText("Gate-area messaging")}>
          <div className="message-illustration">
            <Monitor size={60} strokeWidth={1} />
            <Plane size={30} />
          </div>
          <h3>{translateText("Speak to your passengers, at their gate.")}</h3>
          <p className="muted">
            {translateText(
              "Schedule an upgrade, lounge offer or destination partner message. Own-flight boarding receives priority after hard eligibility checks.",
            )}
          </p>
          <button
            className="primary"
            onClick={() =>
              context.setModal({ type: "campaign", messaging: true })
            }
          >
            <Plus size={14} />
            {translateText("Schedule gate message")}
          </button>
        </Panel>
        <Panel
          title={translateText("A warmer wait")}
          tag={translateText("GOODWILL AUTOMATION")}
        >
          <h3>{translateText("When plans change, care comes first.")}</h3>
          <p className="muted">
            {translateText(
              "A qualifying flight delay creates a gate-targeted meal voucher with Juniper Coffee, co-funded 50/50.",
            )}
          </p>
          <label>
            {translateText("Delay threshold (minutes)")}
            <input
              type="number"
              value={threshold}
              min="1"
              max="240"
              onChange={(e) => setThreshold(+e.target.value)}
            />
          </label>
          <button
            onClick={() =>
              context
                .action(
                  "/airlines/" + airline.id,
                  { goodwillThreshold: threshold },
                  "PATCH",
                )
                .then(() =>
                  context.notify(
                    "Goodwill threshold saved. Future delay events will use this rule.",
                  ),
                )
            }
          >
            {translateText("Save automation")}
          </button>
          <div className="ai-note">
            <Ticket size={18} />
            <p>
              {translateText(
                context.state.campaigns.filter(
                  (c: ApiRecord) => c.airlineId === context.airline,
                ).length,
              )}
              {translateText(" ")}
              {translateText("offers currently activated for this airline.")}
            </p>
          </div>
        </Panel>
      </div>
      <Panel title={translateText("What played at your gates and why")}>
        <DecisionPanel decision={context.state.decision} />
      </Panel>
    </>
  );
}

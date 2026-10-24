import { translateText } from "../../../i18n/index";
import { useState } from "react";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Override(
  context: WorkspaceContext & {
    close: () => void;
  },
) {
  const [screen, setScreen] = useState("S124");
  const [campaign, setCampaign] = useState("C1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <h2>{translateText("Pin with accountability.")}</h2>
      <p className="muted">
        {translateText(
          "The campaign still must pass every safety and eligibility rule. The reason is logged with each affected decision.",
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await context.action("/screens/" + screen + "/override", {
              campaignId: campaign,
              reason,
            });
            context.notify("Override saved. Safety rules remain enforced.");
            context.close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <label>
          {translateText("Screen")}
          <select value={screen} onChange={(e) => setScreen(e.target.value)}>
            {context.state.screens.map((state: ApiRecord) => (
              <option key={state.id} value={state.id}>
                {translateText(state.id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translateText("Campaign")}
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            {context.state.campaigns.map((c: ApiRecord) => (
              <option key={c.id} value={c.id}>
                {translateText(c.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {translateText("Audit reason")}
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && <p className="form-error">{translateText(error)}</p>}
        <button className="primary" type="submit">
          {translateText("Save audited override")}
        </button>
      </form>
    </>
  );
}

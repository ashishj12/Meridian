import { translateText } from "../../../i18n/index";
import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Empty } from "../../../shared/components/EmptyState";
import { AdArt } from "../../creatives/components/CampaignArtwork";
import { money } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Approvals(context: WorkspaceContext) {
  const [safe, setSafe] = useState(false);
  const [reason, setReason] = useState("");
  const rows = context.state.campaigns.filter(
    (c: ApiRecord) => c.status === "pending",
  );
  return (
    <>
      <div className="approval-checklist">
        <ShieldCheck size={22} />
        <div>
          <b>{translateText("Every creative earns its place.")}</b>
          <p>
            {translateText(
              "Review claims, content, offer validity and suitability for an airport audience.",
            )}
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={safe}
            onChange={(e) => setSafe(e.target.checked)}
          />
          {translateText("Brand safety checklist complete")}
        </label>
      </div>
      <Panel
        title={translateText("Approval queue")}
        tag={`${rows.length} PENDING`}
      >
        <label>
          {translateText("Review note")}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={translateText("Reason for approval or rejection")}
          />
        </label>
        <div className="approval-grid">
          {rows.map((c: ApiRecord) => (
            <div className="approval-card" key={c.id}>
              <AdArt campaign={c} lang={context.lang} mini />
              <h3>{translateText(c.name)}</h3>
              <p>
                {translateText(
                  context.lang === "hi" && c.offerHi ? c.offerHi : c.offer,
                )}
              </p>
              <small>
                {translateText(c.zoneIds.join(", "))}
                {translateText(" \u00B7 ")}
                {translateText(money(c.budget))}
                {translateText(" budget")}
              </small>
              <div className="row-actions">
                <button
                  className="primary"
                  disabled={!safe}
                  onClick={() =>
                    context
                      .action(`/campaigns/${c.id}/approve`, {
                        brandSafe: safe,
                        reason,
                      })
                      .then(() =>
                        context.notify(
                          "Campaign approved. Decision eligibility updated.",
                        ),
                      )
                  }
                >
                  <Check size={14} />
                  {translateText("Approve")}
                </button>
                <button
                  onClick={() =>
                    context
                      .action(`/campaigns/${c.id}/reject`, {
                        reason: reason || "Creative review rejected",
                      })
                      .then(() => context.notify("Campaign rejected."))
                  }
                >
                  {translateText("Reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
        {translateText(
          !rows.length && (
            <Empty text="All caught up. New campaigns will appear here for review." />
          ),
        )}
      </Panel>
    </>
  );
}

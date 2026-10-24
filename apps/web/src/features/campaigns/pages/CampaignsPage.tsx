import { translateText } from "../../../i18n/index";
import { Plus } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { CampaignTable } from "../components/CampaignTable";
import { Recommendations } from "../../inventory/components/SlotRecommendations";
import type { WorkspaceContext } from "../../../shared/types/workspace";

export function Campaigns(context: WorkspaceContext) {
  return (
    <>
      <div className="toolbar">
        <span>
          {translateText(
            "Campaigns are delivered only after approval and deterministic eligibility checks.",
          )}
        </span>
        <button
          className="primary"
          onClick={() => context.setModal({ type: "campaign" })}
        >
          <Plus size={15} />
          {translateText("Create campaign")}
        </button>
      </div>
      <Panel title={translateText("Campaign workspace")}>
        <CampaignTable {...context} />
      </Panel>
      <Recommendations {...context} />
    </>
  );
}

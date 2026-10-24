import { translateText } from "../../../i18n/index";
import { Plane, Plus, ShoppingBag } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { Empty } from "../../../shared/components/EmptyState";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Partners(context: WorkspaceContext) {
  return (
    <Panel title={translateText("Co-marketing marketplace")}>
      <div className="approval-grid">
        {context.state.partners
          .filter((p: ApiRecord) => p.airlineId === context.airline)
          .map((p: ApiRecord) => (
            <div className="partner-card" key={p.id}>
              <div className="partner-logos">
                <span>
                  <Plane size={25} />
                </span>
                <Plus size={16} />
                <span>
                  <ShoppingBag size={25} />
                </span>
              </div>
              <h3>{translateText(p.name)}</h3>
              <p>{translateText(p.offer)}</p>
              <Badge value={p.status} />
              <div className="row-actions">
                <button
                  className="primary"
                  onClick={() =>
                    context
                      .action(
                        "/partners/" + p.id,
                        { status: "accepted" },
                        "PATCH",
                      )
                      .then(() => context.notify("Partnership accepted."))
                  }
                >
                  {translateText("Accept partnership")}
                </button>
                <button
                  onClick={() =>
                    context.action(
                      "/partners/" + p.id,
                      { status: "rejected" },
                      "PATCH",
                    )
                  }
                >
                  {translateText("Decline")}
                </button>
              </div>
            </div>
          ))}
      </div>
      {translateText(
        !context.state.partners.some(
          (p: ApiRecord) => p.airlineId === context.airline,
        ) && <Empty text="No partner offers for this airline yet." />,
      )}
    </Panel>
  );
}

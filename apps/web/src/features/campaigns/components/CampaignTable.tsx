import { translateText } from "../../../i18n/index";
import { Copy, ShoppingBag } from "lucide-react";
import { Badge } from "../../../shared/components/StatusBadge";
import { Empty } from "../../../shared/components/EmptyState";
import { money, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function CampaignTable(
  context: WorkspaceContext & {
    limit?: number;
  },
) {
  const { state, org, action, notify } = context;
  const rows = state.campaigns
    .filter((c: ApiRecord) => c.outletId === org)
    .slice(0, context.limit || 100);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{translateText("Campaign")}</th>
            <th>{translateText("Status")}</th>
            <th>{translateText("Placement")}</th>
            <th>{translateText("Budget pacing")}</th>
            <th>{translateText("Stock")}</th>
            <th>{translateText("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c: ApiRecord) => (
            <tr key={c.id}>
              <td>
                <div className="campaign-name">
                  <span
                    className="creative-thumb"
                    style={{ background: c.color }}
                  >
                    <ShoppingBag size={18} />
                  </span>
                  <span>
                    <b>{translateText(c.name)}</b>
                    <small>{translateText(c.offer)}</small>
                  </span>
                </div>
              </td>
              <td>
                <Badge value={c.paused ? "paused" : c.status} />
              </td>
              <td>{translateText(c.zoneIds.join(", "))}</td>
              <td>
                {translateText(money(c.spend, state.config.currency))}
                {translateText(" /")}
                {translateText(" ")}
                {translateText(money(c.budget, state.config.currency))}
                <span className="bar-track">
                  <i style={{ width: percent(c.spend / c.budget) }} />
                </span>
              </td>
              <td>
                <button
                  aria-label={`Toggle stock ${c.name}`}
                  className={`toggle ${c.stock ? "on" : ""}`}
                  onClick={() =>
                    action(`/campaigns/${c.id}`, { stock: !c.stock }, "PATCH")
                  }
                >
                  {translateText(c.stock ? "In stock" : "Out of stock")}
                </button>
              </td>
              <td>
                <div className="row-actions">
                  <button
                    onClick={() =>
                      action(
                        `/campaigns/${c.id}`,
                        { paused: !c.paused },
                        "PATCH",
                      )
                    }
                  >
                    {translateText(c.paused ? "Resume" : "Pause")}
                  </button>
                  <button
                    aria-label={translateText("Duplicate campaign")}
                    onClick={() =>
                      action(`/campaigns/${c.id}/duplicate`, {}).then(() =>
                        notify("Campaign duplicated into the approval queue."),
                      )
                    }
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {translateText(
        !rows.length && (
          <Empty text="No campaigns for this outlet yet. Create your first campaign." />
        ),
      )}
    </div>
  );
}

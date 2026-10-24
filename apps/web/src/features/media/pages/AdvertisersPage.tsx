import { translateText } from "../../../i18n/index";
import { Download } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { money } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Advertisers(context: WorkspaceContext) {
  const spendFor = (id: string) =>
    context.state.campaigns
      .filter((c: ApiRecord) => c.outletId === id)
      .reduce((n: number, c: ApiRecord) => n + c.spend, 0);
  return (
    <>
      <div className="toolbar">
        <p>
          {translateText(
            "Performance is derived from stored activity and actual demo interactions.",
          )}
        </p>
        <a
          className="button"
          href={"/api/analytics/report?outletId=" + context.org}
          target="_blank"
          rel="noreferrer"
        >
          <Download size={15} />
          {translateText("Shareable advertiser report")}
        </a>
      </div>
      <Panel title={translateText("Advertiser overview")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Advertiser")}</th>
                <th>{translateText("Running")}</th>
                <th>{translateText("Spend")}</th>
                <th>{translateText("Budget")}</th>
                <th>{translateText("Delivery")}</th>
                <th>{translateText("Report")}</th>
              </tr>
            </thead>
            <tbody>
              {context.state.outlets
                .slice()
                .sort(
                  (a: ApiRecord, b: ApiRecord) =>
                    spendFor(b.id) - spendFor(a.id),
                )
                .slice(0, 8)
                .map((o: ApiRecord) => {
                  const campaigns = context.state.campaigns.filter(
                    (c: ApiRecord) => c.outletId === o.id,
                  );
                  const spent = campaigns.reduce(
                    (a: number, c: ApiRecord) => a + c.spend,
                    0,
                  );
                  return (
                    <tr key={o.id}>
                      <td>
                        <b>{translateText(o.name)}</b>
                        <small>
                          {translateText(o.zoneId)}
                          {translateText(" \u00B7 ")}
                          {translateText(o.type)}
                        </small>
                      </td>
                      <td>
                        {translateText(
                          campaigns.filter(
                            (c: ApiRecord) => c.status === "approved",
                          ).length,
                        )}
                      </td>
                      <td>{translateText(money(spent))}</td>
                      <td>
                        {translateText(
                          money(
                            campaigns.reduce(
                              (a: number, c: ApiRecord) => a + c.budget,
                              0,
                            ),
                          ),
                        )}
                      </td>
                      <td>
                        <Badge
                          value={spent < 1 ? "Under-delivering" : "Serving"}
                        />
                      </td>
                      <td>
                        <a
                          href={"/api/analytics/report?outletId=" + o.id}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {translateText("Open report \u2197")}
                        </a>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

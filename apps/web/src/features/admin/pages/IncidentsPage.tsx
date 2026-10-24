import { translateText } from "../../../i18n/index";
import { Plus } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { time } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Incidents(context: WorkspaceContext) {
  return (
    <>
      <div className="toolbar">
        <p>
          {translateText(
            "Automatically raised by screen outages, feed lag, and failed creatives.",
          )}
        </p>
        <button
          onClick={() =>
            context
              .action("/incidents", {
                title: "Manual bug report",
                severity: "medium",
                owner: "Operations",
                status: "open",
                timestamp: context.state.clock.time,
              })
              .then(() =>
                context.notify("Bug report created. Edit its details below."),
              )
          }
        >
          <Plus size={15} />
          {translateText("Report a bug")}
        </button>
      </div>
      <Panel title={translateText("Incidents & issues")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Incident")}</th>
                <th>{translateText("Severity")}</th>
                <th>{translateText("Owner")}</th>
                <th>{translateText("Status")}</th>
                <th>{translateText("Raised")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {context.state.incidents.map((i: ApiRecord) => (
                <tr key={i.id}>
                  <td>
                    <b>{translateText(i.title)}</b>
                    <small>
                      {translateText(i.screenId || "Airport network")}
                    </small>
                  </td>
                  <td>
                    <Badge value={i.severity} />
                  </td>
                  <td>{translateText(i.owner)}</td>
                  <td>
                    <select
                      aria-label={`Incident status ${i.id}`}
                      value={i.status}
                      onChange={(e) =>
                        context.action(
                          "/incidents/" + i.id,
                          { status: e.target.value },
                          "PATCH",
                        )
                      }
                    >
                      <option value="open">{translateText("open")}</option>
                      <option value="investigating">
                        {translateText("investigating")}
                      </option>
                      <option value="resolved">
                        {translateText("resolved")}
                      </option>
                    </select>
                  </td>
                  <td>{translateText(time(i.timestamp))}</td>
                  <td>
                    <button
                      onClick={() =>
                        context.setModal({
                          type: "entity",
                          kind: "incidents",
                          value: i,
                        })
                      }
                    >
                      {translateText("Edit")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

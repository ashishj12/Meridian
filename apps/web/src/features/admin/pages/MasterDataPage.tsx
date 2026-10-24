import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { api } from "../../../shared/api/client";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function MasterData(context: WorkspaceContext) {
  const [kind, setKind] = useState("screens");
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const refresh = () => api("/" + kind).then(setRows);
  useEffect(() => {
    refresh();
    setOffset(0);
  }, [kind, context.state.clock.sequence]);
  const filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {[
            "vendors",
            "outlets",
            "airlines",
            "terminals",
            "zones",
            "gates",
            "screens",
            "calendarEvents",
          ].map((k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => setKind(k)}
            >
              {translateText(k)}
            </button>
          ))}
        </div>
        <button
          className="primary"
          onClick={() => context.setModal({ type: "entity", kind })}
        >
          <Plus size={15} />
          {translateText("Add record")}
        </button>
      </div>
      <Panel
        title={`${kind.charAt(0).toUpperCase() + kind.slice(1)} directory`}
        actions={
          <div className="search-field">
            <Search size={14} />
            <input
              aria-label={translateText("Search records")}
              placeholder={translateText("Search records\u2026")}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
            />
          </div>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("ID")}</th>
                <th>{translateText("Name")}</th>
                <th>{translateText("Context")}</th>
                <th>{translateText("Status / type")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(offset, offset + 20).map((r) => (
                <tr key={r.id}>
                  <td className="mono">{translateText(r.id)}</td>
                  <td>
                    <b>{translateText(r.name)}</b>
                  </td>
                  <td>
                    {translateText(
                      r.zoneId || r.terminal || r.contact || "Meridian airport",
                    )}
                  </td>
                  <td>
                    {translateText(
                      r.status ? (
                        <Badge value={r.status} />
                      ) : (
                        r.type || r.orientation || "Active"
                      ),
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        onClick={() =>
                          context.setModal({ type: "entity", kind, value: r })
                        }
                      >
                        {translateText("Edit")}
                      </button>
                      <button
                        className="danger-text"
                        onClick={() =>
                          context
                            .action("/" + kind + "/" + r.id, {}, "DELETE")
                            .then(refresh)
                        }
                      >
                        {translateText("Delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            {translateText(filtered.length)}
            {translateText(" records \u00B7 ")}
            {translateText(offset + 1)}
            {translateText("\u2013")}
            {translateText(Math.min(offset + 20, filtered.length))}
          </span>
          <button disabled={!offset} onClick={() => setOffset(offset - 20)}>
            {translateText("Previous")}
          </button>
          <button
            disabled={offset + 20 >= filtered.length}
            onClick={() => setOffset(offset + 20)}
          >
            {translateText("Next")}
          </button>
        </div>
      </Panel>
    </>
  );
}

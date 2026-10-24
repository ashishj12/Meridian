import { translateText } from "../../../i18n/index";
import { useState } from "react";
import { Check } from "lucide-react";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function EntityForm(
  context: WorkspaceContext & {
    close: () => void;
    kind: string;
    value?: ApiRecord;
  },
) {
  const { kind, value: v } = context;
  const initial: ApiRecord = v || {
    name: "",
    ...(kind === "calendarEvents"
      ? {
          start: "2026-10-14T15:00:00.000Z",
          end: "2026-10-14T18:00:00.000Z",
          zoneIds: [],
        }
      : kind === "screens"
        ? {
            zoneId: "Z7",
            terminal: "T2",
            gate: "42",
            nearestGates: ["42"],
            size: 55,
            orientation: "landscape",
            status: "online",
            latency: 40,
          }
        : kind === "outlets"
          ? { zoneId: "Z7", type: "Retail", stock: true }
          : kind === "zones"
            ? { terminal: "T2" }
            : kind === "gates"
              ? { zoneId: "Z7", terminal: "T2" }
              : kind === "incidents"
                ? {
                    title: "",
                    severity: "medium",
                    owner: "Operations",
                    status: "open",
                  }
                : kind === "vendors"
                  ? { contact: "" }
                  : kind === "airlines"
                    ? { type: "International", goodwillThreshold: 30 }
                    : kind === "packages"
                      ? {
                          screenIds: context.state.screens
                            .filter(
                              (state: ApiRecord) => state.terminal === "T2",
                            )
                            .slice(0, 12)
                            .map((state: ApiRecord) => state.id),
                        }
                      : {}),
  };
  const [form, setForm] = useState<ApiRecord>(initial);
  const [error, setError] = useState("");
  const fields = Object.keys(initial).filter(
    (k) =>
      !["id", "timestamp", "offlineSince", "override", "source"].includes(k) &&
      typeof initial[k] !== "object",
  );
  return (
    <>
      <span className="eyebrow">
        {translateText("MASTER DATA / ")}
        {translateText(kind.toUpperCase())}
      </span>
      <h2>{translateText(v ? "Edit record" : "Create record")}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await context.action(
              "/" + kind + (v ? "/" + v.id : ""),
              form,
              v ? "PATCH" : "POST",
            );
            context.notify("Record saved. Linked views updated.");
            context.close();
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <div className="form-grid">
          {translateText(
            !v && (
              <label>
                {translateText("Identifier (optional)")}
                <input
                  value={form.id || ""}
                  onChange={(e) =>
                    setForm({ ...form, id: e.target.value || undefined })
                  }
                />
              </label>
            ),
          )}
          {fields.map((k) => (
            <label key={k}>
              {translateText(k.replace(/([A-Z])/g, " $1"))}
              {translateText(
                [
                  "zoneId",
                  "terminal",
                  "orientation",
                  "status",
                  "severity",
                ].includes(k) ? (
                  <select
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  >
                    {(k === "zoneId"
                      ? context.state.zones.map((z: ApiRecord) => z.id)
                      : k === "terminal"
                        ? ["T1", "T2"]
                        : k === "orientation"
                          ? ["landscape", "portrait"]
                          : k === "severity"
                            ? ["low", "medium", "high", "critical"]
                            : kind === "incidents"
                              ? ["open", "investigating", "resolved"]
                              : ["online", "degraded", "offline"]
                    ).map((x: string) => (
                      <option key={x} value={x}>
                        {translateText(x)}
                      </option>
                    ))}
                  </select>
                ) : typeof form[k] === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={form[k]}
                    onChange={(e) =>
                      setForm({ ...form, [k]: e.target.checked })
                    }
                  />
                ) : (
                  <input
                    required={["name", "title", "owner"].includes(k)}
                    type={typeof initial[k] === "number" ? "number" : "text"}
                    value={form[k] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [k]:
                          typeof initial[k] === "number"
                            ? +e.target.value
                            : e.target.value,
                      })
                    }
                  />
                ),
              )}
            </label>
          ))}
          {translateText(
            kind === "screens" && (
              <label>
                {translateText("Nearest gates (comma separated)")}
                <input
                  value={(form.nearestGates || []).join(",")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nearestGates: e.target.value
                        .split(",")
                        .map((x) => x.trim()),
                    })
                  }
                />
              </label>
            ),
          )}
        </div>
        {translateText(
          kind === "packages" && (
            <label>
              {translateText("Bundle screens")}
              <select
                required
                multiple
                size={12}
                value={form.screenIds || []}
                onChange={(e) =>
                  setForm({
                    ...form,
                    screenIds: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value,
                    ),
                  })
                }
              >
                {context.state.screens.map((state: ApiRecord) => (
                  <option key={state.id} value={state.id}>
                    {translateText(state.id)}
                    {translateText("\u00B7")}
                    {translateText(state.terminal)}
                    {translateText("\u00B7 Gate")}
                    {translateText(state.gate)}
                  </option>
                ))}
              </select>
              <small>
                {translateText("Hold Ctrl / Cmd to select multiple screens.")}
              </small>
            </label>
          ),
        )}
        {kind === "calendarEvents" && (
          <label>
            {translateText("Zones")}
            <select
              multiple
              value={form.zoneIds || []}
              onChange={(event) =>
                setForm({
                  ...form,
                  zoneIds: Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                })
              }
            >
              {context.state.zones.map((zone: ApiRecord) => (
                <option key={zone.id} value={zone.id}>
                  {zone.id} · {zone.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p className="form-error">{translateText(error)}</p>}
        <button type="submit" className="primary">
          {translateText("Save record")}
          <Check size={15} />
        </button>
      </form>
    </>
  );
}

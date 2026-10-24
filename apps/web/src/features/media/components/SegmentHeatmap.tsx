import { translateText } from "../../../i18n/index";
import { useEffect, useState } from "react";
import { Panel } from "../../../shared/components/Panel";
import { api } from "../../../shared/api/client";
import { fmt } from "../../../shared/lib/format";
import type { WorkspaceContext } from "../../../shared/types/workspace";

type Heatmap = {
  sourceCount: number;
  hours: number[];
  rows: {
    zoneId: string;
    values: Record<string, number>;
  }[];
};
/** Unlike the compact live snapshot, this read model includes every canonical flight. */
export function SegmentHeatmap(context: WorkspaceContext) {
  const [segment, setSegment] = useState("holiday");
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/analytics/heatmap?segment=" + segment)
      .then((data) => {
        if (active) {
          setHeatmap(data);
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [segment, context.state.clock.sequence]);
  return (
    <Panel
      title={translateText("Audience opportunity heatmap")}
      tag={translateText("SEGMENT × HOUR × ZONE")}
      actions={
        <select
          aria-label={translateText("Heatmap segment")}
          value={segment}
          onChange={(event) => setSegment(event.target.value)}
        >
          {["holiday", "family", "business", "international"].map((value) => (
            <option key={value} value={value}>
              {translateText(value)}
            </option>
          ))}
        </select>
      }
    >
      {error && <p role="alert">{translateText(error)}</p>}
      <div className="table-wrap">
        <table className="segment-heatmap">
          <thead>
            <tr>
              <th>{translateText("Zone / terminal")}</th>
              {heatmap?.hours.map((hour) => (
                <th key={hour}>{hour}:00</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap?.rows.map((row) => (
              <tr key={row.zoneId}>
                <th>{row.zoneId}</th>
                {heatmap.hours.map((hour) => (
                  <td
                    key={hour}
                    style={{
                      backgroundColor:
                        "rgba(120,145,90," +
                        Math.min(0.7, (row.values[hour] || 0) / 1200) +
                        ")",
                    }}
                  >
                    {fmt(row.values[hour] || 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        {translateText("Canonical flight movements included:")}{" "}
        {heatmap?.sourceCount ?? "…"}
        {translateText(". Values are aggregate audience estimates.")}
      </p>
    </Panel>
  );
}

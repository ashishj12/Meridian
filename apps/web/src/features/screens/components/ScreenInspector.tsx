import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Badge } from "../../../shared/components/StatusBadge";
import { DecisionPanel } from "../../intelligence/components/DecisionEvidence";
import { api } from "../../../shared/api/client";
import { time } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function ScreenDetail(
  context: WorkspaceContext & {
    id: string;
  },
) {
  const [d, setD] = useState<ApiRecord | null>(null);
  useEffect(() => {
    api("/screens/" + context.id + "/decision").then(setD);
  }, [context.id, context.state.clock.sequence]);
  const sc = context.state.screens.find((a: ApiRecord) => a.id === context.id);
  if (!sc) return <p>{translateText(translateText("Screen not found."))}</p>;
  return (
    <>
      <span className="eyebrow">{translateText("CONNECTED PLAYER")}</span>
      <h2>{translateText(sc.name)}</h2>
      <div className="toolbar">
        <Badge value={sc.status} />
        <span>
          {translateText("Gate ")}
          {translateText(sc.gate)}
          {translateText(" \u00B7 ")}
          {translateText(sc.size)}
          {translateText("\u2033 \u00B7 ")}
          {translateText(sc.orientation)}
        </span>
      </div>
      {d && <DecisionPanel decision={d} />}
      <button
        onClick={() =>
          context.action(
            "/screens/" + sc.id,
            {
              status: sc.status === "offline" ? "online" : "offline",
              offlineSince: context.state.clock.time,
            },
            "PATCH",
          )
        }
      >
        {translateText(
          sc.status === "offline" ? "Restore screen" : "Take screen offline",
        )}
      </button>
    </>
  );
}

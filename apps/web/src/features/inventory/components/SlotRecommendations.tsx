import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { Empty } from "../../../shared/components/EmptyState";
import { api } from "../../../shared/api/client";
import { fmt, money, time } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Recommendations(context: WorkspaceContext) {
  const [slots, setSlots] = useState<ApiRecord[]>([]);
  const [campaign, setCampaign] = useState("C1");
  useEffect(() => {
    api("/recommendations/slots?campaignId=" + campaign).then(setSlots);
  }, [campaign, context.state.bookings.length, context.state.clock.sequence]);
  return (
    <Panel
      title={translateText("Tomorrow, intelligently planned")}
      tag={translateText("BEST 3 SLOTS")}
      actions={
        <select
          aria-label={translateText("Recommendation campaign")}
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        >
          {context.state.campaigns.map((c: ApiRecord) => (
            <option key={c.id} value={c.id}>
              {translateText(c.name)}
            </option>
          ))}
        </select>
      }
    >
      <div className="recommendations">
        {slots.map((slot, i) => (
          <div className="recommendation" key={slot.id}>
            <div>
              <span className="rank">
                {translateText("0")}
                {translateText(i + 1)}
              </span>
              <Badge value={i === 0 ? "Best fit" : "Available"} />
            </div>
            <h3>
              {translateText(slot.screenId)}{" "}
              <span>
                {translateText("\u00B7 ")}
                {translateText(slot.zoneId)}
              </span>
            </h3>
            <b>
              {translateText(time(slot.timestamp))}
              {translateText(" \u2013 ")}
              {translateText(time(slot.timestamp + 3600000))}
              <small>{translateText("15 OCT \u00B7 TOMORROW")}</small>
            </b>
            <p>
              {translateText(fmt(slot.impressions))}
              {translateText(" est. impressions \u00B7 ")}
              {translateText(slot.redemptions)}
              {translateText(" est. redemptions")}
            </p>
            <small>{translateText(slot.reason)}</small>
            <button
              onClick={() =>
                context
                  .action("/inventory/book", {
                    screenId: slot.screenId,
                    campaignId: campaign,
                    timestamp: slot.timestamp,
                  })
                  .then(() =>
                    context.notify(
                      "Slot booked. Inventory and campaign spend updated.",
                    ),
                  )
              }
            >
              {translateText("Book for ")}
              {translateText(money(slot.price, context.state.config.currency))}
              <ArrowUpRight size={14} />
            </button>
          </div>
        ))}
        {translateText(
          !slots.length && (
            <Empty text="No suitable available slots within this campaign's remaining budget." />
          ),
        )}
      </div>
    </Panel>
  );
}

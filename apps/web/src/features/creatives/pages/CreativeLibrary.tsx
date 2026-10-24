import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { AdArt } from "../components/CampaignArtwork";
import { api } from "../../../shared/api/client";
import { fmt, money, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function Library(context: WorkspaceContext) {
  const [brief, setBrief] = useState(
    "Festive sweets, 20% off, families flying domestic.",
  );
  const [creative, setCreative] = useState<ApiRecord | null>(null);
  const [historyRows, setHistoryRows] = useState<ApiRecord[]>([]);
  const [stored, setStored] = useState<ApiRecord[]>([]);
  useEffect(() => {
    api("/analytics/history?outletId=" + context.org).then(setHistoryRows);
    api("/creatives").then(setStored);
  }, [context.org]);
  return (
    <>
      <div className="two-columns">
        <Panel
          title={translateText("Creative studio")}
          tag={translateText("OFFLINE ASSISTANT")}
        >
          <p className="muted">
            {translateText(
              "Describe your next moment. A bilingual template, ready to make your own.",
            )}
          </p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            aria-label={translateText("Creative brief")}
            rows={4}
          />
          <button
            className="primary"
            onClick={() =>
              context.action("/creatives/generate", { brief }).then(setCreative)
            }
          >
            <Sparkles size={15} />
            {translateText("Generate template")}
          </button>
          {translateText(
            creative && (
              <div className="generated-editor">
                <Badge value="Offline template provider" />
                <label>
                  {translateText("Headline")}
                  <input
                    value={creative.headline}
                    onChange={(e) =>
                      setCreative({ ...creative, headline: e.target.value })
                    }
                  />
                </label>
                <label>
                  {translateText("Hindi headline")}
                  <input
                    value={creative.headlineHi}
                    onChange={(e) =>
                      setCreative({ ...creative, headlineHi: e.target.value })
                    }
                  />
                </label>
                <label>
                  {translateText("Offer")}
                  <input
                    value={creative.offer}
                    onChange={(e) =>
                      setCreative({ ...creative, offer: e.target.value })
                    }
                  />
                </label>
                <button
                  onClick={() =>
                    context
                      .action("/creatives", {
                        ...creative,
                        name: creative.headline,
                      })
                      .then((c: ApiRecord) => {
                        setStored([...stored, c]);
                        context.notify("Bilingual creative saved to library.");
                      })
                  }
                >
                  {translateText("Save creative to library")}
                </button>
              </div>
            ),
          )}
        </Panel>
        <Panel title={translateText("Creative preview")}>
          <AdArt
            campaign={
              creative || {
                headline: "Something sweet for the journey.",
                offer: "20% off · a little moment for you",
                color: "#d8bea0",
              }
            }
            lang={context.lang}
            mini
          />
          <p className="footnote">
            {translateText(
              "Controlled offline template generation \u00B7 English + Hindi \u00B7 Editable copy",
            )}
          </p>
        </Panel>
      </div>
      <Panel title={translateText("Reusable creative library")}>
        <div className="creative-library">
          {stored.map((c) => (
            <div key={c.id}>
              <AdArt campaign={c} lang={context.lang} mini />
              <b>{translateText(c.headline)}</b>
            </div>
          ))}
          <label className="upload-tile">
            <Plus />
            {translateText("Upload PNG / JPEG / WebP")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 950000)
                  return context.notify(
                    "Please choose a raster asset smaller than 950 KB.",
                  );
                const reader = new FileReader();
                reader.onload = () =>
                  context
                    .action("/creatives", {
                      name: file.name,
                      image: reader.result,
                      headline: file.name,
                      offer: "Your offer here",
                      headlineHi: "आपके लिए खास ऑफर",
                    })
                    .then((c: ApiRecord) => {
                      setStored([...stored, c]);
                      context.notify("Creative uploaded and saved.");
                    });
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
      </Panel>
      <Panel title={translateText("Campaign history \u00B7 30-day comparison")}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{translateText("Campaign")}</th>
                <th>{translateText("Impressions")}</th>
                <th>{translateText("Spend")}</th>
                <th>{translateText("Redemptions")}</th>
                <th>{translateText("ROI")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {context.state.campaigns
                .filter((c: ApiRecord) => c.outletId === context.org)
                .map((c: ApiRecord) => {
                  const rows = historyRows.filter((a) => a.campaignId === c.id);
                  const sum = (k: string) =>
                    rows.reduce((n, a) => n + (a[k] || 0), 0);
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{translateText(c.name)}</b>
                        <small>
                          {translateText(
                            "Template A / B comparison via recorded campaign activity",
                          )}
                        </small>
                      </td>
                      <td>{translateText(fmt(sum("impressions")))}</td>
                      <td>{translateText(money(sum("spend")))}</td>
                      <td>{translateText(fmt(sum("redemptions")))}</td>
                      <td>
                        {translateText(
                          percent(
                            sum("spend")
                              ? (sum("revenue") - sum("spend")) / sum("spend")
                              : 0,
                          ),
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            context
                              .action(`/campaigns/${c.id}/duplicate`, {})
                              .then(() =>
                                context.notify(
                                  "Run again: saved for approval.",
                                ),
                              )
                          }
                        >
                          <RefreshCw size={13} />
                          {translateText("Run again")}
                        </button>
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

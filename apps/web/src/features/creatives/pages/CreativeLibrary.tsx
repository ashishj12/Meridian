import { translateText } from "../../../i18n/index";
import { useState, useEffect } from "react";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { Panel } from "../../../shared/components/Panel";
import { Badge } from "../../../shared/components/StatusBadge";
import { AdArt } from "../components/CampaignArtwork";
import { MockScreenPreview } from "../components/MockScreenPreview";
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
  const [previewLanguage, setPreviewLanguage] = useState("en");
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
          tag={translateText("CREATIVE ASSISTANT")}
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
              context.action("/creatives/generate", { brief }).then((result) => {
                setCreative(result);
                setPreviewLanguage("en");
              })
            }
          >
            <Sparkles size={15} />
            {translateText("Generate template")}
          </button>
          {translateText(
            creative && (
              <div className="generated-editor">
                <Badge value={creative.label || "Creative provider"} />
                <label>
                  {translateText("Headline")}
                  <input
                    value={creative.headline}
                    onChange={(e) => {
                      const headline = e.target.value;
                      setCreative({
                        ...creative,
                        headline,
                        ...(creative.adPage
                          ? {
                              adPage: {
                                ...creative.adPage,
                                headline: {
                                  ...creative.adPage.headline,
                                  en: headline,
                                },
                              },
                            }
                          : {}),
                      });
                    }}
                  />
                </label>
                <label>
                  {translateText("Headline")} (
                  {(creative.secondLanguage || "hi").toUpperCase()})
                  <input
                    value={creative.headlineSecond || creative.headlineHi || ""}
                    onChange={(e) => {
                      const headlineSecond = e.target.value;
                      const language = creative.secondLanguage || "hi";
                      setCreative({
                        ...creative,
                        headlineSecond,
                        ...(language === "hi"
                          ? { headlineHi: headlineSecond }
                          : {}),
                        ...(creative.adPage
                          ? {
                              adPage: {
                                ...creative.adPage,
                                headline: {
                                  ...creative.adPage.headline,
                                  [language]: headlineSecond,
                                },
                              },
                            }
                          : {}),
                      });
                    }}
                  />
                </label>
                <label>
                  {translateText("Offer")}
                  <input
                    value={creative.offer}
                    onChange={(e) => {
                      const offer = e.target.value;
                      setCreative({
                        ...creative,
                        offer,
                        ...(creative.adPage
                          ? {
                              adPage: {
                                ...creative.adPage,
                                offer: { ...creative.adPage.offer, en: offer },
                              },
                            }
                          : {}),
                      });
                    }}
                  />
                </label>
                <label>
                  {translateText("Offer")} (
                  {(creative.secondLanguage || "hi").toUpperCase()})
                  <input
                    value={creative.offerSecond || creative.offerHi || ""}
                    onChange={(e) => {
                      const offerSecond = e.target.value;
                      const language = creative.secondLanguage || "hi";
                      setCreative({
                        ...creative,
                        offerSecond,
                        ...(language === "hi" ? { offerHi: offerSecond } : {}),
                        ...(creative.adPage
                          ? {
                              adPage: {
                                ...creative.adPage,
                                offer: {
                                  ...creative.adPage.offer,
                                  [language]: offerSecond,
                                },
                              },
                            }
                          : {}),
                      });
                    }}
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
          <MockScreenPreview
            creative={
              creative || {
                category: "sweets",
                headline: "A sweeter start to your journey.",
                headlineHi: "आपके सफर की मीठी शुरुआत।",
                secondLanguage: "hi",
                offer: "20% off on Festive sweets",
                offerHi: "Festive sweets पर 20% की छूट",
                color: "#d8bea0",
                cta: "Scan. Claim. Enjoy.",
              }
            }
            screen={
              context.state.screens.find(
                (screen: ApiRecord) => screen.id === context.screen,
              ) || context.state.screens[0]
            }
            language={previewLanguage}
            onLanguageChange={setPreviewLanguage}
          />
          <p className="footnote">
            {translateText(
              "Offline template generation \u00B7 English + configured language \u00B7 Editable copy",
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

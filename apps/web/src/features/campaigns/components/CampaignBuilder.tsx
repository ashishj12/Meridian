import { translateText } from "../../../i18n/index";
import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { AdArt } from "../../creatives/components/CampaignArtwork";
import { api } from "../../../shared/api/client";
import { fmt, percent } from "../../../shared/lib/format";
import type {
  ApiRecord,
  WorkspaceContext,
} from "../../../shared/types/workspace";

export function CampaignBuilder(
  context: WorkspaceContext & {
    close: () => void;
    messaging?: boolean;
  },
) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState<ApiRecord[]>([]);
  const [form, setForm] = useState<ApiRecord>({
    name: "A moment before departure",
    outletId: context.org,
    headline: "Your journey. A little more extraordinary.",
    headlineHi: "आपकी यात्रा, कुछ और खास।",
    offer: "15% off · exclusively at Meridian",
    offerHi: "15% छूट · केवल मेरिडियन पर",
    zoneIds: ["Z7"],
    screenIds: [],
    gateIds: [],
    weights: { holiday: 0.8, family: 0.6, business: 0.2 },
    minimumCrowd: 100,
    minimumDwell: 15,
    internationalOnly: false,
    destination: "",
    delayTrigger: 0,
    festivalId: "",
    eventTrigger: "",
    budget: 2000,
    dailyCap: 300,
    frequencyCap: 30,
    start: "2026-10-14T14:10:00.000Z",
    end: "2026-10-14T23:59:00.000Z",
    category: context.messaging ? "airline" : "retail",
    airlineId: context.messaging ? context.airline : undefined,
  });
  useEffect(() => {
    api("/creatives").then(setLibrary);
  }, []);
  const field = (k: string, v: any) => setForm({ ...form, [k]: v });
  const p = context.state.presence[form.zoneIds[0] || "Z7"];
  const overlap =
    Object.entries(form.weights).reduce(
      (n, [k, w]) => n + (p.segments[k] || 0) * (w as number),
      0,
    ) /
    ((Object.values(form.weights).reduce(
      (n: any, w: any) => n + w,
      0,
    ) as number) || 1);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      await context.action("/campaigns", form);
      context.notify(
        "Campaign saved and submitted for Media Manager approval.",
      );
      context.close();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <span className="eyebrow">{translateText("CAMPAIGN STUDIO")}</span>
      <h2>
        {translateText(
          context.messaging
            ? "Create a gate moment."
            : "Make your next connection.",
        )}
      </h2>
      <div className="stepper">
        {["Creative", "Audience & placement", "Schedule & review"].map(
          (l, i) => (
            <button
              key={l}
              className={step === i + 1 ? "active" : ""}
              onClick={() => setStep(i + 1)}
            >
              <span>{translateText(i + 1)}</span>
              {translateText(l)}
            </button>
          ),
        )}
      </div>
      <form onSubmit={submit}>
        <div className="builder-grid">
          <div>
            {translateText(
              step === 1 ? (
                <>
                  <label>
                    {translateText("Campaign name")}
                    <input
                      required
                      minLength={3}
                      value={form.name}
                      onChange={(e) => field("name", e.target.value)}
                    />
                  </label>
                  <label>
                    {translateText("Reuse saved creative")}
                    <select
                      onChange={(e) => {
                        const c = library.find((c) => c.id === e.target.value);
                        if (c)
                          setForm({
                            ...form,
                            headline: c.headline,
                            headlineHi: c.headlineHi,
                            offer: c.offer,
                            image: c.image,
                          });
                      }}
                    >
                      <option value="">
                        {translateText("Choose a template")}
                      </option>
                      {library.map((c) => (
                        <option value={c.id} key={c.id}>
                          {translateText(c.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {translateText("Headline")}
                    <input
                      required
                      value={form.headline}
                      onChange={(e) => field("headline", e.target.value)}
                    />
                  </label>
                  <label>
                    {translateText("Hindi headline")}
                    <input
                      value={form.headlineHi}
                      onChange={(e) => field("headlineHi", e.target.value)}
                    />
                  </label>
                  <label>
                    {translateText("Offer")}
                    <input
                      required
                      value={form.offer}
                      onChange={(e) => field("offer", e.target.value)}
                    />
                  </label>
                </>
              ) : step === 2 ? (
                <>
                  <label>
                    {translateText("Target zones")}
                    <select
                      multiple
                      value={form.zoneIds}
                      onChange={(e) =>
                        field(
                          "zoneIds",
                          Array.from(e.target.selectedOptions, (o) => o.value),
                        )
                      }
                    >
                      {context.state.zones.map((z: ApiRecord) => (
                        <option key={z.id} value={z.id}>
                          {translateText(z.terminal)}
                          {translateText(" \u00B7 ")}
                          {translateText(z.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="footnote">
                    {translateText("Hold Ctrl / Cmd to select multiple zones.")}
                  </p>
                  <div className="form-grid">
                    <label>
                      {translateText("Specific screens (optional)")}
                      <input
                        placeholder={translateText("S124,S125")}
                        value={form.screenIds.join(",")}
                        onChange={(e) =>
                          field(
                            "screenIds",
                            e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </label>
                    <label>
                      {translateText("Specific gates (optional)")}
                      <input
                        placeholder={translateText("41,42")}
                        value={form.gateIds.join(",")}
                        onChange={(e) =>
                          field(
                            "gateIds",
                            e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </label>
                  </div>
                  {Object.entries(form.weights).map(([k, w]) => (
                    <label key={k}>
                      {translateText(k)}
                      {translateText(" weight \u00B7 ")}
                      {translateText(String(w))}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step=".1"
                        value={w as number}
                        onChange={(e) =>
                          field("weights", {
                            ...form.weights,
                            [k]: +e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <div className="form-grid">
                    <label>
                      {translateText("Min. dwell (min)")}
                      <input
                        type="number"
                        min="0"
                        value={form.minimumDwell}
                        onChange={(e) => field("minimumDwell", +e.target.value)}
                      />
                    </label>
                    <label>
                      {translateText("Min. crowd")}
                      <input
                        type="number"
                        min="0"
                        value={form.minimumCrowd}
                        onChange={(e) => field("minimumCrowd", +e.target.value)}
                      />
                    </label>
                    <label>
                      {translateText("Destination")}
                      <input
                        placeholder={translateText("e.g. DXB")}
                        value={form.destination}
                        onChange={(e) =>
                          field("destination", e.target.value.toUpperCase())
                        }
                      />
                    </label>
                    <label>
                      {translateText("Delay trigger (min)")}
                      <input
                        type="number"
                        min="0"
                        value={form.delayTrigger}
                        onChange={(e) => field("delayTrigger", +e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={form.internationalOnly}
                      onChange={(e) =>
                        field("internationalOnly", e.target.checked)
                      }
                    />
                    {translateText("International audience only")}
                  </label>
                </>
              ) : (
                <>
                  <div className="form-grid">
                    <label>
                      {translateText("Start")}
                      <input
                        required
                        type="datetime-local"
                        value={form.start.slice(0, 16)}
                        onChange={(e) =>
                          field("start", e.target.value + ":00.000Z")
                        }
                      />
                    </label>
                    <label>
                      {translateText("End")}
                      <input
                        required
                        type="datetime-local"
                        value={form.end.slice(0, 16)}
                        onChange={(e) =>
                          field("end", e.target.value + ":00.000Z")
                        }
                      />
                    </label>
                    <label>
                      {translateText("Total budget")}
                      <input
                        type="number"
                        min="1"
                        value={form.budget}
                        onChange={(e) => field("budget", +e.target.value)}
                      />
                    </label>
                    <label>
                      {translateText("Daily cap")}
                      <input
                        type="number"
                        min="1"
                        value={form.dailyCap}
                        onChange={(e) => field("dailyCap", +e.target.value)}
                      />
                    </label>
                    <label>
                      {translateText("Screen frequency cap")}
                      <input
                        type="number"
                        min="1"
                        value={form.frequencyCap}
                        onChange={(e) => field("frequencyCap", +e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="ai-note">
                    <ShieldCheck size={18} />
                    <p>
                      {translateText(
                        "Submits to Media Manager approval. Only approved creatives and campaigns can reach a screen. Times are UTC in the simulation day.",
                      )}
                    </p>
                  </div>
                </>
              ),
            )}
          </div>
          <div>
            <AdArt campaign={form} lang={context.lang} mini />
            <div className="match-preview">
              <Sparkles size={17} />
              <div>
                <b>
                  {translateText(percent(overlap))}
                  {translateText(" estimated audience match")}
                </b>
                <small>
                  {translateText(fmt(p.count * 12))}
                  {translateText(" estimated impressions \u00B7")}
                  {translateText(" ")}
                  {translateText(Math.round(p.count * 12 * 0.02))}
                  {translateText(" estimated redemptions per hour")}
                </small>
                <small>
                  {translateText(
                    "Preview heuristic \u00B7 actual selection also validates all hard rules.",
                  )}
                </small>
              </div>
            </div>
          </div>
        </div>
        {error && <p className="form-error">{translateText(error)}</p>}
        <div className="form-grid">
          <label>
            {translateText("Festival calendar")}
            <select
              value={form.festivalId}
              onChange={(event) => field("festivalId", event.target.value)}
            >
              <option value="">{translateText("None")}</option>
              {context.state.calendarEvents.map((event: ApiRecord) => (
                <option key={event.id} value={event.id}>
                  {translateText(event.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {translateText("Flight event trigger")}
            <select
              value={form.eventTrigger}
              onChange={(event) => field("eventTrigger", event.target.value)}
            >
              <option value="">{translateText("None")}</option>
              <option value="boarding">{translateText("Boarding")}</option>
              <option value="gate-change">
                {translateText("Gate change")}
              </option>
            </select>
          </label>
          <label>
            {translateText("Offer in Hindi")}
            <input
              value={form.offerHi}
              onChange={(event) => field("offerHi", event.target.value)}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            onClick={() => (step > 1 ? setStep(step - 1) : context.close())}
          >
            <ArrowLeft size={14} />
            {translateText(step > 1 ? "Back" : "Cancel")}
          </button>
          <button className="primary" disabled={saving} type="submit">
            {translateText(step < 3 ? "Continue" : "Submit for approval")}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </>
  );
}

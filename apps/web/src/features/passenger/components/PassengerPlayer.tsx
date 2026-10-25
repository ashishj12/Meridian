import { translateText } from "../../../i18n/index";
import {
  ArrowUpRight,
  Clock3,
  Plane,
  Radio,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import { PhysicalFrame } from "./PhysicalFrame";
import type { ApiRecord, AirportState } from "../../../shared/types/workspace";
import { time as tm, percent as pct } from "../../../shared/lib/format";

interface PassengerPlayerProps {
  portrait: boolean;
  artDirection: string;
  decision: ApiRecord | null;
  selectedScreen: ApiRecord;
  state: AirportState;
  category: string;
  creative: ApiRecord;
  heading: string;
  lang: string;
  offer: string;
  countdown: number;
  flights: ApiRecord[];
  toggleWhy: () => void;
  why: boolean;
  relevant: ApiRecord[];
  error: string;
}
/** Physical signage presentation. Selection and shared clock state are supplied by the studio. */
export function PassengerPlayer({
  portrait,
  artDirection,
  decision,
  selectedScreen,
  state,
  category,
  creative,
  heading,
  lang,
  offer,
  countdown,
  flights,
  toggleWhy,
  why,
  relevant,
  error,
}: PassengerPlayerProps) {
  const demographics = [
    ["Gender split", decision?.presence.gender],
    ["Cabin tier", decision?.presence.cabin],
    ["Age bands", decision?.presence.age],
  ];
  return (
    <PhysicalFrame portrait={portrait}>
      <div
        className={`airport-player direction-${artDirection}`}
        data-testid="airport-player"
        data-campaign={decision?.campaignId || "fallback"}
      >
        <div className="player-masthead">
          <span className="airport-signature">
            <Plane size={34} strokeWidth={1.6} />
            <span>
              {translateText("MERIDIAN")}
              <small>{translateText("INTERNATIONAL AIRPORT")}</small>
            </span>
          </span>
          <span className="player-gate">
            {translateText(selectedScreen.terminal)} <i />
            {translateText("GATE ")}
            {translateText(selectedScreen.gate)}
          </span>
          <time>{translateText(tm(state.clock.time))}</time>
        </div>
        {translateText(
          selectedScreen.status === "offline" ? (
            <div className="player-outage">
              <Wifi size={100} />
              <h2>{translateText("Temporarily offline.")}</h2>
              <p>{translateText("This display will be back shortly.")}</p>
            </div>
          ) : !decision ? (
            <div className="player-outage">
              <Radio size={100} />
              <h2>
                {translateText(
                  error ? "Display unavailable" : "Connecting your display.",
                )}
              </h2>
              <p>
                {translateText(error || "Loading the shared airport playlist…")}
              </p>
            </div>
          ) : (
            <>
              <div className="player-content">
                <section
                  className="campaign-hero"
                  aria-label={translateText("Live campaign creative")}
                >
                  {translateText(
                    creative.image ? (
                      <img
                        className="campaign-photography uploaded-art"
                        src={creative.image}
                        alt="Approved campaign artwork"
                      />
                    ) : artDirection === "expedition" ||
                      artDirection === "postcards" ? (
                      <img
                        className="campaign-photography"
                        src={
                          artDirection === "postcards"
                            ? "/campaign-art/little-orbit-postcards.png"
                            : "/campaign-art/little-orbit-expedition.png"
                        }
                        alt={
                          artDirection === "postcards"
                            ? "A carefully arranged collection of travel toys and little keepsakes"
                            : "Original adventure toy collection with an airplane, explorer bear and travel backpack"
                        }
                      />
                    ) : artDirection === "atelier" ? (
                      <img
                        className="campaign-photography"
                        src="/campaign-art/aurelia-atelier.png"
                        alt="Amber fragrance bottle in warm architectural sunlight"
                      />
                    ) : artDirection === "cafe" ? (
                      <div className="cafe-art" aria-hidden="true">
                        <div className="cafe-orbit" />
                        <div className="cafe-cup">
                          <span>
                            {translateText("JUNIPER")}
                            <small>
                              {translateText("A MOMENT, WELL SPENT.")}
                            </small>
                          </span>
                        </div>
                        <span className="cafe-steam">
                          {translateText("\u223F")}
                        </span>
                      </div>
                    ) : (
                      <div className="airport-art" aria-hidden="true">
                        <Plane size={400} strokeWidth={0.6} />
                        <div />
                        <div />
                      </div>
                    ),
                  )}
                  <div className="campaign-copy">
                    <div className="campaign-wordmark">
                      {translateText(
                        category === "toys" ? (
                          <>
                            <span className="orbit-mark">
                              {translateText("\u2733")}
                            </span>
                            {translateText("LITTLE ORBIT")}
                          </>
                        ) : category === "perfume" || category === "beauty" ? (
                          "AURELIA"
                        ) : artDirection === "cafe" ? (
                          "JUNIPER"
                        ) : (
                          "MERIDIAN"
                        ),
                      )}
                      <small>
                        {translateText(
                          category === "toys"
                            ? "MADE FOR THE WAY THERE"
                            : category === "perfume"
                              ? "EAU DE VOYAGE"
                              : "A BETTER JOURNEY STARTS HERE",
                        )}
                      </small>
                    </div>
                    <h2 className="campaign-headline">
                      {translateText(heading)}
                    </h2>
                    <p className="campaign-support">
                      {translateText(
                        category === "toys"
                          ? lang === "hi"
                            ? "छोटे सफर में, बड़ी खोज।"
                            : "A little curiosity. A whole world to discover."
                          : category === "perfume"
                            ? lang === "hi"
                              ? "सफर में थोड़ी सी खासियत।"
                              : "Take something extraordinary with you."
                            : lang === "hi"
                              ? "उड़ान से पहले, अपने लिए एक पल।"
                              : "Your next favourite moment. Before departure.",
                      )}
                    </p>
                    <div className="campaign-offer">
                      {translateText(offer)}
                      <ArrowUpRight size={38} />
                    </div>
                    <span className="campaign-location">
                      {translateText(
                        category === "toys"
                          ? "LITTLE ORBIT TOYS"
                          : category === "perfume"
                            ? "AURELIA DUTY FREE"
                            : "EXPLORE YOUR TERMINAL",
                      )}
                      <span>
                        {translateText("NEAR GATE ")}
                        {translateText(selectedScreen.gate)}
                      </span>
                    </span>
                  </div>
                </section>
                <aside
                  className="redemption-zone"
                  aria-label={translateText("Offer and redemption")}
                >
                  <div className="redemption-copy">
                    <span className="redemption-eyebrow">
                      {translateText("A LITTLE SOMETHING FOR YOUR JOURNEY")}
                    </span>
                    <h3>
                      {translateText(
                        lang === "hi"
                          ? "स्कैन करें। ऑफर पाएँ।"
                          : "Scan to claim.",
                      )}
                    </h3>
                    <p className="redemption-offer">{translateText(offer)}</p>
                  </div>
                  {translateText(
                    decision.promo ? (
                      <>
                        <a
                          className="redemption-qr"
                          href={"/claim/" + decision.promo.id}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={translateText("Open mobile offer claim")}
                        >
                          <img
                            src={"/api/promos/" + decision.promo.id + "/qr"}
                            alt="Scannable offer QR code"
                          />
                        </a>
                        <div className="redemption-timing">
                          <Clock3 size={28} />
                          <span>
                            {translateText(
                              lang === "hi"
                                ? "ऑफर समाप्त होने में"
                                : "Offer ends in",
                            )}
                            <b>
                              {translateText(
                                Math.floor(countdown / 60)
                                  .toString()
                                  .padStart(2, "0"),
                              )}
                              {translateText(":")}
                              {translateText(
                                (countdown % 60).toString().padStart(2, "0"),
                              )}
                            </b>
                          </span>
                        </div>
                        <p className="redemption-instruction">
                          {translateText("No app. No sign-up.")}
                          <br />
                          {translateText("Just a better airport moment.")}
                        </p>
                      </>
                    ) : (
                      <div className="redemption-fallback">
                        <Plane size={100} />
                        <p>
                          {translateText("Discover more")}
                          <br />
                          {translateText("around your gate.")}
                        </p>
                      </div>
                    ),
                  )}
                </aside>
              </div>
              <section
                className="player-departures"
                aria-label={translateText("Nearby departures")}
              >
                <div className="departures-label">
                  <Plane size={28} />
                  <span>
                    {translateText("NEARBY")}
                    <br />
                    {translateText("DEPARTURES")}
                  </span>
                </div>
                <div className="departure-cards">
                  {flights.map((f: ApiRecord) => (
                    <article className="departure-card" key={f.id}>
                      <div>
                        <b>{translateText(f.number)}</b>
                        <span>
                          {translateText("GATE ")}
                          {translateText(f.gate)}
                        </span>
                      </div>
                      <h3>{translateText(f.destination)}</h3>
                      <p>
                        <span>
                          <small>{translateText("SCHEDULED")}</small>
                          {translateText(tm(f.scheduled))}
                        </span>
                        <span>
                          <small>{translateText("ESTIMATED")}</small>
                          {translateText(tm(f.estimated))}
                        </span>
                        <strong
                          className={`flight-state ${/delay/i.test(f.status) ? "delayed" : /boarding/i.test(f.status) ? "boarding" : ""}`}
                        >
                          {translateText(f.status)}
                        </strong>
                      </p>
                    </article>
                  ))}
                  {translateText(
                    !flights.length && (
                      <div className="no-departures">
                        {translateText(
                          "Please check the main departure board for your next flight.",
                        )}
                      </div>
                    ),
                  )}
                  {demographics.map(([title, values]) => (
                    <div className="player-profile-bars" key={title}>
                      <h4>{translateText(title)}</h4>
                      {Object.entries(values || {}).map(([label, value]) => (
                        <div className="player-segment" key={label}>
                          <span>
                            {translateText(label)}
                            <b>{translateText(pct(value as number))}</b>
                          </span>
                          <i>
                            <span style={{ width: pct(value as number) }} />
                          </i>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <button
                  className="player-why"
                  onClick={toggleWhy}
                  aria-label={translateText("Why this ad?")}
                >
                  <Sparkles size={24} />
                  <span>{translateText("Why this ad?")}</span>
                </button>
              </section>
            </>
          ),
        )}
        {translateText(
          why && decision && (
            <div
              className="player-evidence"
              role="dialog"
              aria-label={translateText("Why this ad?")}
            >
              <div className="evidence-top">
                <span>
                  <ShieldCheck size={32} />
                  {translateText("EVIDENCE-FIRST MATCHING")}
                </span>
                <button
                  aria-label={translateText("Close explanation")}
                  onClick={toggleWhy}
                >
                  <X size={36} />
                </button>
              </div>
              <h2>
                {translateText("A relevant moment.")}
                <br />
                {translateText("A reason you can see.")}
              </h2>
              <p>{translateText(decision.reason)}</p>
              <div className="evidence-body">
                <div>
                  <h3>{translateText("Estimated audience")}</h3>
                  {["holiday", "family", "business", "international"].map(
                    (key) => (
                      <div className="player-segment" key={key}>
                        <span>
                          {translateText(key)}
                          <b>
                            {translateText(
                              pct(decision.presence.segments[key]),
                            )}
                          </b>
                        </span>
                        <i>
                          <span
                            style={{
                              width: pct(decision.presence.segments[key]),
                            }}
                          />
                        </i>
                      </div>
                    ),
                  )}
                </div>
                <div>
                  <h3>{translateText("The top candidates")}</h3>
                  {relevant.map((c: ApiRecord) => (
                    <article className="player-candidate" key={c.id}>
                      <div>
                        <b>{translateText(c.name)}</b>
                        <strong>{translateText(c.score.toFixed(2))}</strong>
                      </div>
                      <small>
                        {translateText(
                          c.eligible
                            ? `${pct(c.match)} audience fit · ${c.boost}× trigger boost`
                            : c.reasons.join(" · "),
                        )}
                      </small>
                    </article>
                  ))}
                </div>
              </div>
              <div className="evidence-source">
                {translateText(decision.presence.count)}
                {translateText(" estimated passengers \u00B7 ")}
                {translateText(decision.presence.dwell)}
                {translateText("m dwell \u00B7 ")}
                {translateText(decision.modelVersion)}
                {translateText(" / ")}
                {translateText(decision.ruleVersion)}
                <br />
                {translateText("Source flights: ")}
                {translateText(decision.presence.flightIds.join(", "))}
                {translateText(" \u00B7 Queue:")}
                {translateText(" ")}
                {translateText(decision.presence.queueIds.join(", "))}
              </div>
            </div>
          ),
        )}
      </div>
    </PhysicalFrame>
  );
}

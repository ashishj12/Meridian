import { PassengerPlayer } from "./components/PassengerPlayer";
import { translateText } from "../../i18n/index";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Expand,
  Globe2,
  Monitor,
  Pause,
  Plane,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import "./passenger.css";

type ApiRecord = Record<string, any>;
const tm = (t: number | string) =>
  new Date(t).toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
const pct = (n: number) => `${Math.round((n || 0) * 100)}%`;
/** Screen Studio owns selection, simulation controls and fullscreen lifecycle. */

export default function PassengerDisplay(context: any) {
  const { state, screen, setScreen, lang = "en", compact = false } = context;
  const [decision, setDecision] = useState<ApiRecord | null>(null);
  const [error, setError] = useState("");
  const [portrait, setPortrait] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [why, setWhy] = useState(false);
  const [direction, setDirection] = useState("auto");
  const stage = useRef<HTMLDivElement>(null);
  const nativeFullscreen = useRef(false);
  const selected =
    state.screens.find((sc: ApiRecord) => sc.id === screen) || state.screens[0];
  useEffect(() => {
    let active = true;
    context
      .api("/screens/" + screen + "/decision")
      .then((d: ApiRecord) => {
        if (active) {
          setDecision(d);
          setError("");
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [screen, state.clock.sequence]);
  useEffect(() => {
    setPortrait(compact || selected?.orientation === "portrait");
    setWhy(false);
  }, [screen]);
  useEffect(() => setDirection("auto"), [decision?.campaignId]);
  useEffect(() => {
    const changed = () => {
      if (nativeFullscreen.current && !document.fullscreenElement) {
        nativeFullscreen.current = false;
        setImmersive(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImmersive(false);
        if (document.fullscreenElement)
          document.exitFullscreen().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", changed);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    if (!immersive) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [immersive]);
  const enter = () => {
    setImmersive(true);
    setWhy(false);
    stage.current
      ?.requestFullscreen?.()
      .then(() => {
        nativeFullscreen.current = true;
      })
      .catch(() => {
        /* Immersive CSS stage remains available when the browser blocks native fullscreen. */
      });
  };
  const exit = () => {
    setImmersive(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const d = decision?.screenId === screen ? decision : null;
  const campaign = state.campaigns.find(
    (c: ApiRecord) => c.id === d?.campaignId,
  );
  const creative = d?.creative || {
    category: "information",
    headline: "A world of possibilities awaits.",
    headlineHi: "आपके सफर का अगला अध्याय।",
    offer: "Explore Meridian International",
  };
  const category = d?.category || "information";
  const artDirection =
    direction === "auto"
      ? category === "toys"
        ? "expedition"
        : category === "perfume" || category === "beauty"
          ? "atelier"
          : ["coffee", "goodwill", "food", "sweets"].includes(category)
            ? "cafe"
            : "information"
      : direction;
  const flights = state.flights
    .filter(
      (f: ApiRecord) => f.zoneId === selected.zoneId && f.direction === "D",
    )
    .sort(
      (a: ApiRecord, b: ApiRecord) =>
        Math.abs(Number(a.gate) - Number(selected.gate)) -
        Math.abs(Number(b.gate) - Number(selected.gate)),
    )
    .slice(0, portrait ? 2 : 3);
  const relevant =
    d?.candidates
      .filter((c: ApiRecord) => c.eligible || c.id === "C3")
      .sort(
        (a: ApiRecord, b: ApiRecord) =>
          Number(b.id === d.campaignId) - Number(a.id === d.campaignId) ||
          b.score - a.score,
      )
      .slice(0, 3) || [];
  const countdown = Math.max(
    0,
    Math.floor(
      ((d?.promo?.expiry || state.clock.time) - state.clock.time) / 1000,
    ),
  );
  const heading =
    lang === "hi" && creative.headlineHi
      ? creative.headlineHi
      : creative.headline;
  const offer =
    lang === "hi" && creative.offerHi ? creative.offerHi : creative.offer;
  const toggleWhy = () => setWhy((v) => !v);
  const player = (
    <PassengerPlayer
      portrait={portrait}
      artDirection={artDirection}
      decision={d}
      selectedScreen={selected}
      state={state}
      category={category}
      creative={creative}
      heading={heading}
      lang={lang}
      offer={offer}
      countdown={countdown}
      flights={flights}
      toggleWhy={toggleWhy}
      why={why}
      relevant={relevant}
      error={error}
    />
  );
  if (compact)
    return (
      <div className="studio-compact">
        <div className="compact-display-label">
          <span>
            <Monitor size={16} />
            {translateText(screen)}
            {translateText(" \u00B7 Gate ")}
            {translateText(selected.gate)}
          </span>
          <button
            onClick={enter}
            aria-label={translateText("Fullscreen passenger display")}
          >
            <Expand size={16} />
          </button>
        </div>
        <div
          ref={stage}
          className={immersive ? "immersive-stage" : "compact-display-stage"}
          data-testid={immersive ? "immersive-stage" : undefined}
        >
          {player}
          {translateText(
            immersive && (
              <button
                className="immersive-exit"
                onClick={exit}
                aria-label={translateText("Exit fullscreen")}
              >
                <X size={20} />
                <span>{translateText("Exit \u00B7 Esc")}</span>
              </button>
            ),
          )}
        </div>
      </div>
    );
  return (
    <div className="screen-studio">
      <nav
        className="studio-navigation"
        aria-label={translateText("Screen Studio navigation")}
      >
        <a href="/" className="studio-brand">
          <span className="studio-monogram">
            {translateText(state.config.theme.logo)}
          </span>
          {translateText(
            state.config.theme.name === "MERIDIAN"
              ? "meridian."
              : state.config.theme.name,
          )}
          <i />
          <span>{translateText("Screen Studio")}</span>
        </a>
        <div>
          <span className="studio-connected">
            <i />
            {translateText(
              context.connected ? "Live airport connection" : "Reconnecting",
            )}
          </span>
          <button
            onClick={() => context.onLanguage(lang === "en" ? "hi" : "en")}
            className="studio-language"
          >
            <Globe2 size={17} />
            {translateText(lang === "en" ? "EN" : "हिन्दी")}
          </button>
          <select
            aria-label={translateText("Role")}
            value="passenger"
            onChange={(e) => context.onRole(e.target.value)}
          >
            {["admin", "retailer", "media", "airline", "passenger"].map((r) => (
              <option key={r} value={r}>
                {translateText(context.t(r))}
              </option>
            ))}
          </select>
        </div>
      </nav>
      <main className="studio-main">
        <header className="studio-heading">
          <div>
            <p>{translateText("FROM AIRPORT SIGNALS TO MEANINGFUL MOMENTS")}</p>
            <h1
              aria-label={
                lang === "hi" ? "यात्री डिस्प्ले" : "Passenger displays"
              }
            >
              {translateText("Passenger displays")}
              <span className="studio-live-tag">
                <i />
                {translateText("Live")}
              </span>
            </h1>
            <span>
              {translateText("One connected airport. A more relevant journey.")}
            </span>
          </div>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              context.onRole("admin");
            }}
          >
            <ArrowLeft size={17} />
            {translateText("Back to workspace")}
          </a>
        </header>
        <section
          className="studio-controls"
          aria-label={translateText("Display controls")}
        >
          <div className="studio-screen-select">
            <Monitor size={20} />
            <label>
              {translateText("Physical screen")}
              <select
                aria-label={translateText("Physical screen")}
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
              >
                {state.screens.map((sc: ApiRecord) => (
                  <option key={sc.id} value={sc.id}>
                    {translateText(sc.id)}
                    {translateText(" \u00B7 ")}
                    {translateText(sc.terminal)}
                    {translateText(" \u00B7 Gate ")}
                    {translateText(sc.gate)}
                    {translateText(" \u00B7 ")}
                    {translateText(sc.zoneId)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="studio-orientation"
            role="group"
            aria-label={translateText("Display orientation")}
          >
            <button
              className={!portrait ? "is-selected" : ""}
              onClick={() => setPortrait(false)}
              aria-pressed={!portrait}
              aria-label={translateText("Landscape orientation")}
            >
              {translateText("16:9 ")}
              <span>{translateText("Landscape")}</span>
            </button>
            <button
              className={portrait ? "is-selected" : ""}
              onClick={() => setPortrait(true)}
              aria-pressed={portrait}
              aria-label={translateText("Portrait orientation")}
            >
              {translateText("9:16 ")}
              <span>{translateText("Portrait")}</span>
            </button>
          </div>
          <div className="studio-clock">
            <button
              aria-label={
                state.clock.playing ? "Pause simulation" : "Play simulation"
              }
              onClick={() =>
                context.action("/simulation/control", {
                  action: state.clock.playing ? "pause" : "play",
                })
              }
            >
              {translateText(
                state.clock.playing ? <Pause size={17} /> : <Play size={17} />,
              )}
            </button>
            <span>
              <small>{translateText("SHARED SIMULATION \u00B7 UTC")}</small>
              <time>
                {translateText(tm(state.clock.time))}
                <i>
                  {translateText(":")}
                  {translateText(
                    new Date(state.clock.time)
                      .getUTCSeconds()
                      .toString()
                      .padStart(2, "0"),
                  )}
                </i>
              </time>
            </span>
            <select
              aria-label={translateText("Simulation speed")}
              value={state.clock.speed}
              onChange={(e) =>
                context.action("/simulation/control", {
                  speed: +e.target.value,
                })
              }
            >
              {[1, 10, 60].map((n) => (
                <option value={n} key={n}>
                  {translateText(n)}
                  {translateText("\u00D7")}
                </option>
              ))}
            </select>
          </div>
          <div className="studio-actions">
            <details className="studio-simulation-menu">
              <summary>{translateText("Simulation")}</summary>
              <div>
                <label>
                  {translateText("Jump to time")}
                  <input
                    type="time"
                    defaultValue={tm(state.clock.time)}
                    onChange={(event) =>
                      event.target.value &&
                      context.action("/simulation/control", {
                        time:
                          new Date(state.clock.time)
                            .toISOString()
                            .slice(0, 10) +
                          "T" +
                          event.target.value +
                          ":00.000Z",
                      })
                    }
                  />
                </label>
                <button
                  onClick={() =>
                    context.action("/simulation/control", { action: "reset" })
                  }
                >
                  {translateText("Reset simulation")}
                </button>
                <button
                  onClick={() =>
                    context.action("/simulation/events", {
                      type: "gate-change",
                      flightId: "XY501",
                      gate: "43",
                    })
                  }
                >
                  {translateText("Gate change")}
                </button>
                <button
                  onClick={() =>
                    context.action("/simulation/events", {
                      type: "screen-offline",
                      screenId: screen,
                    })
                  }
                >
                  {translateText("Screen offline")}
                </button>
              </div>
            </details>
            <button
              aria-label={translateText("Inject XY501 delay")}
              onClick={() =>
                context.action("/simulation/events", {
                  type: "delay",
                  flightId: "XY501",
                  minutes: 45,
                })
              }
            >
              <Zap size={17} />
              <span>{translateText("Inject delay")}</span>
            </button>
            <button
              className="studio-launch"
              aria-label={translateText("Fullscreen passenger display")}
              onClick={enter}
            >
              <Expand size={17} />
              {translateText("Launch fullscreen")}
            </button>
          </div>
        </section>
        {translateText(
          error && (
            <div className="studio-error" role="alert">
              {translateText(error)}
              <button onClick={() => context.refresh()}>
                {translateText("Retry connection")}
              </button>
            </div>
          ),
        )}
        <div
          className={`studio-layout ${portrait ? "studio-portrait-layout" : ""}`}
        >
          <section className="studio-preview">
            <div className="studio-preview-label">
              <span>
                <i />
                {translateText(screen)} <em>{translateText(" / ")}</em>{" "}
                {translateText(portrait ? "1080 × 1920" : "1920 × 1080")}
              </span>
              <span>
                {translateText(selected.size)}
                {translateText("\u2033 \u00B7 ")}
                {translateText(selected.status)}
              </span>
            </div>
            <div
              ref={stage}
              className={
                immersive
                  ? "immersive-stage"
                  : `studio-stage ${portrait ? "portrait-stage" : ""}`
              }
              data-testid={immersive ? "immersive-stage" : "studio-stage"}
            >
              {player}
              {translateText(
                immersive && (
                  <button
                    className="immersive-exit"
                    onClick={exit}
                    aria-label={translateText("Exit fullscreen")}
                  >
                    <X size={20} />
                    <span>{translateText("Exit \u00B7 Esc")}</span>
                  </button>
                ),
              )}
            </div>
            <div className="studio-preview-footer">
              <span>
                <Radio size={14} />
                {translateText(
                  "Live backend playlist \u00B7 shared simulation",
                )}
              </span>
              <span>{translateText("Physical aspect ratio preserved")}</span>
            </div>
          </section>
          <aside className="studio-context">
            <section>
              <div className="context-section-title">
                <span>{translateText("ON THIS SCREEN")}</span>
                <span className="verified-chip">
                  <ShieldCheck size={13} />
                  {translateText("Verified")}
                </span>
              </div>
              <h2>{translateText(campaign?.name || "Airport information")}</h2>
              <p>{translateText(offer)}</p>
              <div className="context-properties">
                <span>
                  {translateText("Placement")}
                  <b>
                    {translateText(selected.terminal)}
                    {translateText(" \u00B7 Gate ")}
                    {translateText(selected.gate)}
                  </b>
                </span>
                <span>
                  {translateText("Campaign")}
                  <b>{translateText(d?.campaignId || "Safe fallback")}</b>
                </span>
                <span>
                  {translateText("Decision model")}
                  <b>{translateText(d?.modelVersion || "—")}</b>
                </span>
              </div>
              <label className="art-direction-label">
                {translateText("Art direction")}
                <select
                  aria-label={translateText("Art direction")}
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="auto">
                    {translateText("Campaign default")}
                  </option>
                  {translateText(
                    category === "toys" ? (
                      <>
                        <option value="expedition">
                          {translateText("01 \u00B7 The little expedition")}
                        </option>
                        <option value="postcards">
                          {translateText("02 \u00B7 Postcards & keepsakes")}
                        </option>
                      </>
                    ) : category === "perfume" || category === "beauty" ? (
                      <option value="atelier">
                        {translateText("The fragrance atelier")}
                      </option>
                    ) : (
                      <option value={artDirection}>
                        {translateText("Editorial campaign")}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <small>
                {translateText(
                  "Preview treatments preserve the selected campaign, offer and QR destination.",
                )}
              </small>
            </section>
            <section className="context-decision">
              <div className="context-section-title">
                <span>
                  <Sparkles size={15} />
                  {translateText("WHY THIS MOMENT?")}
                </span>
              </div>
              <p>
                {translateText(
                  d?.reason || "Connecting to the airport decision engine…",
                )}
              </p>
              <div className="context-audience">
                <span>
                  <b>{translateText(d?.presence.count || 0)}</b>
                  {translateText("estimated passengers")}
                </span>
                <span>
                  <b>
                    {translateText(d?.presence.dwell || 0)}
                    <i>{translateText(" min")}</i>
                  </b>
                  {translateText("median dwell")}
                </span>
              </div>
              <div className="context-candidates">
                {relevant.map((c: ApiRecord) => (
                  <div key={c.id}>
                    <span>
                      {translateText(c.name)}
                      <small>
                        {translateText(
                          c.eligible
                            ? "Audience eligible"
                            : "Placement excluded",
                        )}
                      </small>
                    </span>
                    <b>{translateText(c.score.toFixed(2))}</b>
                  </div>
                ))}
              </div>
              <button
                className="context-explain"
                aria-label={translateText("Inspect decision evidence")}
                onClick={toggleWhy}
              >
                <ShieldCheck size={16} />
                {translateText("Why this ad?")}
                <ArrowUpRight size={16} />
              </button>
            </section>
            <section className="context-flights">
              <div className="context-section-title">
                <span>
                  <Plane size={16} />
                  {translateText("NEARBY DEPARTURES")}
                </span>
              </div>
              {flights.slice(0, 2).map((f: ApiRecord) => (
                <div key={f.id}>
                  <span>
                    <b>{translateText(f.number)}</b>
                    <small>
                      {translateText("Gate ")}
                      {translateText(f.gate)}
                      {translateText(" \u00B7 ")}
                      {translateText(f.destination)}
                    </small>
                  </span>
                  <span>
                    <b>{translateText(tm(f.estimated))}</b>
                    <small className={f.delay ? "flight-delay" : ""}>
                      {translateText(f.status)}
                    </small>
                  </span>
                </div>
              ))}
            </section>
          </aside>
        </div>
        <footer className="studio-footnote">
          <ShieldCheck size={15} />
          {translateText(
            "Fictional airport \u00B7 Aggregate audience estimates \u00B7 No passenger identity tracking",
          )}
          <span>
            {translateText("QR destination: ")}
            {translateText(state.publicBaseUrl)}
          </span>
        </footer>
      </main>
    </div>
  );
}

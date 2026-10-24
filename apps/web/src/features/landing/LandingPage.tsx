import { translateText } from "../../i18n/index";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Menu,
  X,
  Plane,
  Monitor,
  ShoppingBag,
  Radio,
  Building2,
  Clock3,
  ShieldCheck,
  ScanLine,
  Play,
  Layers3,
} from "lucide-react";
import "./landing.css";

const workspaces = [
  {
    id: "admin",
    name: "Airport operations",
    short: "Operations",
    icon: Building2,
    headline: "The whole airport. In view.",
    text: "Monitor screen health, inspect decisions and keep every terminal connected.",
    link: "Open operations",
  },
  {
    id: "retailer",
    name: "Retailers",
    short: "Retail",
    icon: ShoppingBag,
    headline: "Meet the moment that matters.",
    text: "Create campaigns, understand the audience near your outlet and follow offers through to redemption.",
    link: "Open retail workspace",
  },
  {
    id: "media",
    name: "Media teams",
    short: "Media",
    icon: Radio,
    headline: "Give every placement a purpose.",
    text: "Plan inventory, review creative and connect available screen time with relevant campaigns.",
    link: "Open media workspace",
  },
  {
    id: "airline",
    name: "Airlines",
    short: "Airlines",
    icon: Plane,
    headline: "A better wait starts here.",
    text: "Follow flights, manage gate messages and explore retail partnerships around the journey.",
    link: "Open airline workspace",
  },
  {
    id: "passenger",
    name: "Passenger displays",
    short: "Displays",
    icon: Monitor,
    headline: "Make waiting worth their while.",
    text: "Bring relevant campaigns, nearby departures and scannable offers together on one beautiful screen.",
    link: "Open Screen Studio",
  },
];
const questions = [
  [
    "What is MERIDIAN?",
    "MERIDIAN is an airport retail intelligence playground. It connects flight events, estimated audiences, campaign selection, digital displays and offer redemption in one working application.",
  ],
  [
    "Can I try every workspace?",
    "Yes. Open any of the five workspaces without an account. The role selector lets you move between airport operations, retail, media, airline and passenger display views.",
  ],
  [
    "Is the airport data real?",
    "This is a fictional airport demonstration. Flights, retailers, campaigns and audience estimates are synthetic. The demo includes 900 flights, 180 screen placements and 40 retail outlets; these are playground data counts, not customer or adoption claims.",
  ],
  [
    "Do the displays and QR codes actually work?",
    "Yes. Screen Studio supports landscape and portrait displays, fullscreen playback, live flight information and real QR claim links. A mobile claim can be redeemed in the demo and appears in retailer analytics.",
  ],
  [
    "How does the live scenario work?",
    "Every workspace follows one shared simulation clock. In the application, inject a delay for XY501 to update estimated dwell and audience, campaign scores and the selected display. The small example on this page is illustrative and does not change the running scenario.",
  ],
];
export default function LandingPage({
  language,
  onLanguageChange,
}: {
  language: string;
  onLanguageChange: (language: string) => void;
}) {
  const [active, setActive] = useState("admin");
  const [delayed, setDelayed] = useState(false);
  const [menu, setMenu] = useState(false);
  const selected = workspaces.find((w) => w.id === active)!;
  return (
    <div className="meridian-landing">
      <a className="landing-skip" href="#landing-main">
        {translateText("Skip to content")}
      </a>
      <header className="landing-header">
        <a
          className="meridian-wordmark"
          href="/"
          aria-label={translateText("MERIDIAN home")}
        >
          <span className="meridian-mark">{translateText("M")}</span>
          {translateText("meridian")}
          <span className="wordmark-period">{translateText(".")}</span>
        </a>
        <nav
          className={`landing-nav ${menu ? "is-open" : ""}`}
          aria-label={translateText("Main navigation")}
        >
          {[
            ["Product", "#product"],
            ["Workspaces", "#workspaces"],
            ["How it works", "#how-it-works"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {translateText(label)}
            </a>
          ))}
        </nav>
        <div className="landing-header-actions">
          <button
            className="landing-language"
            onClick={() => onLanguageChange(language === "en" ? "hi" : "en")}
            aria-label="Change language"
          >
            {language === "en" ? "हिन्दी" : "EN"}
          </button>
          <a href="/admin" className="landing-login">
            {translateText("Open app ")}
            <ArrowUpRight size={15} />
          </a>
          <a className="brand-button" href="/admin">
            {translateText("Explore MERIDIAN ")}
            <ArrowRight size={16} />
          </a>
          <button
            className="landing-menu"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {translateText(menu ? <X /> : <Menu />)}
          </button>
        </div>
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <a className="hero-announcement" href="#how-it-works">
            <span className="announcement-dot" />
            {translateText("Airport retail, connected.")}
            <ArrowRight size={14} />
          </a>
          <h1 id="landing-title">
            {translateText("Every airport signal.")}
            <br />
            <span>{translateText("A better retail moment.")}</span>
          </h1>
          <p>
            {translateText(
              "Turn flight changes into relevant campaigns, better passenger experiences and measurable retail moments. One airport. Working as one.",
            )}
          </p>
          <div className="hero-actions">
            <a href="/admin" className="brand-button brand-button-large">
              {translateText("Explore the workspace ")}
              <ArrowRight size={18} />
            </a>
            <a className="hero-secondary" href="#how-it-works">
              <span>
                <Play size={12} fill="currentColor" />
              </span>
              {translateText("See how it works")}
            </a>
          </div>
          <div className="hero-footnote">
            {translateText("Five connected workspaces. No account needed.")}
          </div>
        </section>

        <section
          className="landing-product"
          id="product"
          aria-label={translateText("Explore the product")}
        >
          <div className="product-preview-stage">
            <div className="product-window">
              <div className="product-window-bar">
                <span className="window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <ShieldCheck size={13} />
                  {translateText("MERIDIAN / ")}
                  {translateText(selected.name)}
                </span>
                <span className="preview-label">
                  {translateText("Product preview")}
                </span>
              </div>
              <div className="product-window-image">
                <img
                  src={`/product-previews/${active}.png`}
                  alt={`MERIDIAN ${selected.name} application preview`}
                  width="1440"
                  height="900"
                  fetchPriority="high"
                />
              </div>
            </div>
            <div className="product-floating-label">
              <span>
                <Check size={14} />
              </span>
              {translateText("One connected airport.")}
              <small>{translateText("Every perspective, in sync.")}</small>
            </div>
          </div>
          <div
            className="product-tabs"
            role="tablist"
            aria-label={translateText("Preview a workspace")}
          >
            {workspaces.map(({ id, short, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                id={`preview-tab-${id}`}
                aria-controls="workspace-preview-description"
                aria-selected={active === id}
                tabIndex={active === id ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                      event.key,
                    )
                  )
                    return;
                  event.preventDefault();
                  const current = workspaces.findIndex((w) => w.id === active);
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? workspaces.length - 1
                        : (current +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            workspaces.length) %
                          workspaces.length;
                  setActive(workspaces[next].id);
                  event.currentTarget
                    .parentElement!.querySelectorAll<HTMLButtonElement>(
                      '[role="tab"]',
                    )
                    [next].focus();
                }}
                onClick={() => setActive(id)}
              >
                <Icon size={17} />
                {translateText(short)}
              </button>
            ))}
          </div>
          <div
            className="product-caption"
            role="tabpanel"
            id="workspace-preview-description"
            aria-labelledby={`preview-tab-${active}`}
          >
            <div>
              <h2>{translateText(selected.headline)}</h2>
              <p>{translateText(selected.text)}</p>
            </div>
            <a href={`/${active}`}>
              {translateText(selected.link)}
              <ArrowUpRight size={17} />
            </a>
          </div>
        </section>

        <section
          className="landing-scale"
          aria-label={translateText("Playground scale")}
        >
          <p>
            {translateText(
              "ONE FICTIONAL AIRPORT. A COMPLETE WORKING PLAYGROUND.",
            )}
          </p>
          <div>
            <span>
              <b>{translateText("900")}</b>
              {translateText("synthetic flights")}
            </span>
            <span>
              <b>{translateText("180")}</b>
              {translateText("screen placements")}
            </span>
            <span>
              <b>{translateText("40")}</b>
              {translateText("retail outlets")}
            </span>
            <span>
              <b>{translateText("5")}</b>
              {translateText("connected perspectives")}
            </span>
          </div>
        </section>

        <section
          className="landing-story"
          id="how-it-works"
          aria-labelledby="story-title"
        >
          <div className="section-heading">
            <span className="landing-eyebrow">
              {translateText("THE RIGHT MOMENT CHANGES EVERYTHING")}
            </span>
            <h2 id="story-title">
              {translateText("One delay.")}
              <br />
              {translateText("A different opportunity.")}
            </h2>
            <p>
              {translateText(
                "A flight changes. The audience changes. Your airport responds.",
              )}
              <br />
              {translateText(
                "See how one signal connects the whole experience.",
              )}
            </p>
          </div>
          <div
            className="scenario-switch"
            role="group"
            aria-label={translateText("Illustrative flight scenario")}
          >
            <button aria-pressed={!delayed} onClick={() => setDelayed(false)}>
              {translateText("On schedule")}
            </button>
            <button aria-pressed={delayed} onClick={() => setDelayed(true)}>
              <Clock3 size={15} />
              {translateText("45-minute delay")}
            </button>
          </div>
          <div className="scenario-flow">
            <article>
              <span className="scenario-step">
                {translateText("01 / THE SIGNAL")}
              </span>
              <span className="scenario-icon">
                <Plane size={25} />
              </span>
              <h3>{translateText("Flight XY501")}</h3>
              <p>{translateText("Gate 42 \u00B7 T2")}</p>
              <div
                className={`scenario-value ${delayed ? "scenario-delayed" : ""}`}
              >
                {translateText(delayed ? "Delayed +45 min" : "On schedule")}
              </div>
              <span className="scenario-detail">
                {translateText(
                  delayed
                    ? "Estimated departure 15:25"
                    : "Scheduled departure 14:40",
                )}
              </span>
            </article>
            <span className="scenario-arrow">
              <ArrowRight size={21} />
            </span>
            <article>
              <span className="scenario-step">
                {translateText("02 / THE AUDIENCE")}
              </span>
              <span className="scenario-icon">
                <Layers3 size={25} />
              </span>
              <h3>{translateText("More time to discover")}</h3>
              <p>{translateText("Estimated at Gate 42")}</p>
              <div className="scenario-value">
                {translateText(delayed ? "420" : "233")}
                <small>{translateText("passengers")}</small>
              </div>
              <span className="scenario-detail">
                {translateText(delayed ? "52" : "39")}
                {translateText(" min median dwell")}
              </span>
            </article>
            <span className="scenario-arrow">
              <ArrowRight size={21} />
            </span>
            <article className="scenario-campaign">
              <span className="scenario-step">
                {translateText("03 / THE MOMENT")}
              </span>
              <div className="scenario-art">
                <img
                  src={
                    delayed
                      ? "/campaign-art/aurelia-atelier.png"
                      : "/campaign-art/little-orbit-expedition.png"
                  }
                  alt={
                    delayed
                      ? "Amber fragrance product photograph"
                      : "Toy airplane and explorer bear product photograph"
                  }
                  loading="lazy"
                />
              </div>
              <h3>
                {translateText(
                  delayed
                    ? "A little luxury before you fly"
                    : "More play. More adventure.",
                )}
              </h3>
              <p>
                {translateText(
                  delayed ? "15% off fragrance" : "Buy 2, get 1 free",
                )}
              </p>
              <span className="scenario-detail">
                <ShieldCheck size={14} />
                {translateText(delayed ? "0.86" : "0.48")}
                {translateText(" evidence-backed score")}
              </span>
            </article>
          </div>
          <p className="scenario-disclaimer">
            {translateText(
              "Illustrative worked example from the demo scenario.",
            )}
            {translateText(" ")}
            <a href="/admin">
              {translateText("Run it in the live workspace ")}
              <ArrowUpRight size={13} />
            </a>
          </p>
        </section>

        <section
          className="landing-workspaces"
          id="workspaces"
          aria-labelledby="workspaces-title"
        >
          <div className="section-heading">
            <span className="landing-eyebrow">
              {translateText("LESS DISCONNECTION. MORE POSSIBILITY.")}
            </span>
            <h2 id="workspaces-title">
              {translateText("One airport.")}
              <br />
              {translateText("Every perspective.")}
            </h2>
            <p>
              {translateText(
                "Different teams. Shared context. A workspace for every part of the journey.",
              )}
            </p>
          </div>
          <div className="workspace-directory">
            {workspaces.map(({ id, name, icon: Icon, text }, i) => (
              <a key={id} className="workspace-entry" href={`/${id}`}>
                <span className="workspace-index">
                  {translateText("0")}
                  {translateText(i + 1)}
                </span>
                <span className="workspace-directory-icon">
                  <Icon size={25} />
                </span>
                <div>
                  <h3>{translateText(name)}</h3>
                  <p>{translateText(text)}</p>
                </div>
                <ArrowUpRight size={23} />
              </a>
            ))}
          </div>
        </section>

        <section
          className="landing-display-story"
          aria-labelledby="display-story-title"
        >
          <div className="display-story-visual">
            <div className="display-story-player">
              <img
                src="/product-previews/passenger.png"
                alt="MERIDIAN passenger display with original toy campaign, large QR code and nearby departures"
                width="1920"
                height="1080"
                loading="lazy"
              />
            </div>
            <span>
              <span className="announcement-dot" />
              {translateText("A real display. A real offer. A better wait.")}
            </span>
          </div>
          <div className="display-story-copy">
            <span className="landing-eyebrow">
              {translateText("FROM CONTEXT TO CONNECTION")}
            </span>
            <h2 id="display-story-title">
              {translateText("The right offer.")}
              <br />
              {translateText("Right by the gate.")}
            </h2>
            <p>
              {translateText(
                "Make every screen part of the journey. Relevant creative, readable flight information and one simple action: scan to claim.",
              )}
            </p>
            <ul>
              <li>
                <Check size={17} />
                {translateText("Landscape and portrait, beautifully composed")}
              </li>
              <li>
                <Check size={17} />
                {translateText("Fullscreen playback with live updates")}
              </li>
              <li>
                <Check size={17} />
                {translateText("QR claims connected to retailer analytics")}
              </li>
            </ul>
            <a className="brand-button" href="/passenger">
              {translateText("Explore Screen Studio ")}
              <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section
          className="landing-principles"
          aria-label={translateText("Built around context")}
        >
          <div>
            <ShieldCheck size={26} />
            <h3>{translateText("A reason behind every decision.")}</h3>
            <p>
              {translateText(
                "Inspect candidate scores, audience estimates and matching evidence. Understand why an offer was selected.",
              )}
            </p>
          </div>
          <div>
            <Clock3 size={26} />
            <h3>{translateText("One clock. One shared reality.")}</h3>
            <p>
              {translateText(
                "Flight events, campaign selection and every workspace follow the same simulation time.",
              )}
            </p>
          </div>
          <div>
            <ScanLine size={26} />
            <h3>{translateText("Follow the moment through.")}</h3>
            <p>
              {translateText(
                "Connect a displayed offer to a scan, a claim and a demo redemption. Keep each step visible.",
              )}
            </p>
          </div>
        </section>

        <section className="landing-faq" id="faq" aria-labelledby="faq-title">
          <div>
            <span className="landing-eyebrow">
              {translateText("A FEW MORE DETAILS")}
            </span>
            <h2 id="faq-title">
              {translateText("Good questions.")}
              <br />
              {translateText("Clear answers.")}
            </h2>
          </div>
          <div className="faq-list">
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {translateText(q)}
                  <ChevronDown size={19} />
                </summary>
                <p>{translateText(a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <span className="landing-eyebrow">
            {translateText("THIS IS MERIDIAN.")}
          </span>
          <h2>
            {translateText("Your airport.")}
            <br />
            {translateText("Working as one.")}
          </h2>
          <p>
            {translateText(
              "Discover what happens when every signal finds its moment.",
            )}
          </p>
          <a className="brand-button" href="/admin">
            {translateText("Step inside the workspace ")}
            <ArrowRight size={18} />
          </a>
          <small>
            {translateText(
              "No sign-up. Five perspectives. One connected experience.",
            )}
          </small>
        </section>
      </main>
      <footer className="landing-footer">
        <div>
          <a href="/" className="meridian-wordmark">
            <span className="meridian-mark">{translateText("M")}</span>
            {translateText("meridian.")}
          </a>
          <p>{translateText("Airport signals. Meaningful moments.")}</p>
        </div>
        <nav aria-label={translateText("Footer navigation")}>
          <a href="#product">{translateText("Product")}</a>
          <a href="#workspaces">{translateText("Workspaces")}</a>
          <a href="#faq">{translateText("FAQ")}</a>
          <a href="/admin">
            {translateText("Open application ")}
            <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="landing-footer-note">
          <span>{translateText("\u00A9 2026 MERIDIAN")}</span>
          <span>
            {translateText(
              "Fictional airport. Synthetic data. A working demonstration.",
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}

import { translateText, setLocale } from "../i18n/index";
import { AppSidebar } from "./layout/AppSidebar";
import { WorkspaceHeader } from "./layout/WorkspaceHeader";
import { SimulationBar } from "./layout/SimulationBar";
import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Plus,
  ShieldCheck,
  X,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import PassengerDisplay from "../features/passenger/PassengerDisplay";
import LandingPage from "../features/landing/LandingPage";
import { useLive } from "../shared/hooks/useLive";
import { Audience } from "../features/audience/pages/AudiencePage";
import { RetailOverview } from "../features/retailer/pages/RetailerDashboard";
import { Campaigns } from "../features/campaigns/pages/CampaignsPage";
import { CampaignBuilder } from "../features/campaigns/components/CampaignBuilder";
import { Library } from "../features/creatives/pages/CreativeLibrary";
import { Incidents } from "../features/admin/pages/IncidentsPage";
import { MasterData } from "../features/admin/pages/MasterDataPage";
import { AdminOverview } from "../features/admin/pages/AdminDashboard";
import { Intelligence } from "../features/intelligence/pages/DecisionExplorer";
import { Inventory } from "../features/media/pages/InventoryPage";
import { Approvals } from "../features/media/pages/ApprovalsPage";
import { Advertisers } from "../features/media/pages/AdvertisersPage";
import { Flights } from "../features/airline/pages/FlightsPage";
import { Messaging } from "../features/airline/pages/GateMessagingPage";
import { Partners } from "../features/airline/pages/PartnersPage";
import { Passenger } from "../features/passenger/PassengerPreview";
import { ScreenDetail } from "../features/screens/components/ScreenInspector";
import { Claim } from "../features/promotions/pages/ClaimPage";
import { EventForm } from "../features/simulation/components/EventForm";
import { Settings } from "../features/admin/components/SettingsForm";
import { EntityForm } from "../features/admin/components/MasterDataForm";
import { Override } from "../features/media/components/ScreenOverrideForm";
import { api } from "../shared/api/client";
import { dictionaries, roleMenus } from "./navigation";
import type { ApiRecord } from "../shared/types/workspace";

export function App() {
  const path = window.location.pathname;
  const init = path.split("/")[1];
  const [role, setRole] = useState(
    ["admin", "retailer", "media", "airline", "passenger"].includes(init)
      ? init
      : "admin",
  );
  const [page, setPage] = useState(roleMenus[role][0][0]);
  const [lang, setLang] = useState(
    localStorage.getItem("meridian-language") || "en",
  );
  const [org, setOrg] = useState("O1");
  const [airline, setAirline] = useState("XY");
  const [split, setSplit] = useState(false);
  const [welcome, setWelcome] = useState(init === "welcome" || path === "/");
  const [modal, setModal] = useState<ApiRecord | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [terminal, setTerminal] = useState("All");
  const [screen, setScreen] = useState("S124");
  const dialogRef = useRef<HTMLElement | null>(null);
  const live = useLive();
  const state = live.state;
  const t = (key: string) => dictionaries[lang][key] || key;
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  };
  const action = async (url: string, body?: any, method = "POST") => {
    try {
      const result = await api(url, body, method);
      await live.refresh();
      return result;
    } catch (e: any) {
      notify(e.message);
      throw e;
    }
  };
  const switchRole = (r: string) => {
    setRole(r);
    setPage(roleMenus[r][0][0]);
    history.replaceState({}, "", `/${r}`);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("meridian-language", lang);
  }, [lang, welcome]);
  useEffect(() => {
    const followHistory = () => {
      const pathname = window.location.pathname;
      const nextRole = pathname.split("/")[1];
      setWelcome(pathname === "/" || nextRole === "welcome");
      if (
        ["admin", "retailer", "media", "airline", "passenger"].includes(
          nextRole,
        )
      ) {
        setRole(nextRole);
        setPage(roleMenus[nextRole][0][0]);
      }
    };
    window.addEventListener("popstate", followHistory);
    return () => window.removeEventListener("popstate", followHistory);
  }, []);
  useEffect(() => {
    if (!modal) return;

    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.focus();

    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setModal(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      document.removeEventListener("keydown", handleDialogKeys);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modal]);
  setLocale(lang);
  if (welcome)
    return <LandingPage language={lang} onLanguageChange={setLang} />;
  if (path.startsWith("/claim/"))
    return <Claim token={path.split("/")[2]} lang={lang} />;
  if (!state)
    return (
      <div className="loading">
        <div className="brandmark">{translateText("M")}</div>
        <h2>{translateText("Connecting the airport.")}</h2>
        <p>
          {translateText(
            live.error || "Loading shared simulation and airport intelligence…",
          )}
        </p>
        {live.error && (
          <button onClick={live.refresh}>{translateText("Reconnect")}</button>
        )}
      </div>
    );
  const context = {
    state,
    action,
    notify,
    lang,
    t,
    org,
    airline,
    screen,
    setScreen,
    search,
    terminal,
    setTerminal,
    setModal,
    setPage,
  };
  const shellProps = {
    ...context,
    role,
    page,
    live,
    split,
    setSplit,
    setLang,
    setSearch,
    switchRole,
    setWelcome,
  };
  if (role === "passenger")
    return (
      <>
        <PassengerDisplay
          {...context}
          api={api}
          onRole={switchRole}
          onLanguage={setLang}
          connected={live.connected}
          refresh={live.refresh}
        />
        {toast && (
          <div className="toast" role="status">
            {translateText(toast)}
          </div>
        )}
      </>
    );
  return (
    <div
      className={`app light ${role === "admin" ? "admin-workspace " + (state.config.adminAppearance === "light" ? "" : "admin-dark") : ""}`}
      style={
        {
          "--accent":
            state.config.theme.accent === "#468cff"
              ? "#1b1b1b"
              : state.config.theme.accent,
        } as React.CSSProperties
      }
    >
      <AppSidebar {...shellProps} />
      <div className="workspace">
        <WorkspaceHeader {...shellProps} />
        <SimulationBar {...shellProps} />
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {translateText("MERIDIAN /")}
                {translateText(" ")}
                {translateText(
                  role === "admin"
                    ? "CONTROL ROOM"
                    : role === "retailer"
                      ? "RETAIL WORKSPACE"
                      : role === "media"
                        ? "MEDIA OPERATIONS"
                        : role === "airline"
                          ? "AIRLINE WORKSPACE"
                          : "DIGITAL SIGNAGE",
                )}
              </div>
              <h1>
                {translateText(
                  role === "admin" && page === "overview"
                    ? t("network")
                    : t(page),
                )}
              </h1>
              <p>
                {translateText(
                  role === "admin"
                    ? "A live view of your airport. Every screen, every signal, every opportunity."
                    : role === "retailer"
                      ? "Meet your next customer before their next departure."
                      : role === "media"
                        ? "The right inventory. The right audience. A better return."
                        : role === "airline"
                          ? "Keep your passengers informed. Make their wait worthwhile."
                          : "Relevant moments, powered by airport intelligence.",
                )}
              </p>
            </div>
            <div className="page-actions">
              {translateText(
                role === "retailer" && (
                  <select
                    aria-label={translateText("Outlet")}
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                  >
                    {state.outlets.map((o: ApiRecord) => (
                      <option key={o.id} value={o.id}>
                        {translateText(o.name)}
                      </option>
                    ))}
                  </select>
                ),
              )}
              {translateText(
                role === "airline" && (
                  <select
                    aria-label={translateText("Airline")}
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                  >
                    {state.airlines.map((o: ApiRecord) => (
                      <option key={o.id} value={o.id}>
                        {translateText(o.name)}
                      </option>
                    ))}
                  </select>
                ),
              )}
              {translateText(
                role === "admin" && (
                  <>
                    <span className="date-chip">
                      <CalendarDays size={14} />
                      {translateText("14 Oct, 2026")}
                    </span>
                    <button
                      onClick={() =>
                        window.open(
                          "/api/analytics/report?outletId=" + org,
                          "_blank",
                        )
                      }
                    >
                      <Download size={14} />
                      {translateText("Export report")}
                    </button>
                  </>
                ),
              )}
              {translateText(
                role === "retailer" && (
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "campaign" })}
                  >
                    <Plus size={15} />
                    {translateText(t("create"))}
                  </button>
                ),
              )}
            </div>
          </div>
          {translateText(
            live.error && (
              <div className="error-banner">
                {translateText("Connection issue: ")}
                {translateText(live.error)}
                <button onClick={live.refresh}>{translateText("Retry")}</button>
              </div>
            ),
          )}
          <div className={split ? "split-grid" : ""}>
            {split && <Passenger {...context} compact />}
            <div className="role-content">
              {translateText(
                role === "admin" &&
                  (page === "overview" ? (
                    <AdminOverview {...context} />
                  ) : page === "incidents" ? (
                    <Incidents {...context} />
                  ) : page === "data" ? (
                    <MasterData {...context} />
                  ) : (
                    <Intelligence {...context} />
                  )),
              )}
              {translateText(
                role === "retailer" &&
                  (page === "overview" ? (
                    <RetailOverview {...context} />
                  ) : page === "campaigns" ? (
                    <Campaigns {...context} />
                  ) : page === "history" ? (
                    <Library {...context} />
                  ) : (
                    <Audience {...context} />
                  )),
              )}
              {translateText(
                role === "media" &&
                  (page === "inventory" ? (
                    <Inventory {...context} />
                  ) : page === "approvals" ? (
                    <Approvals {...context} />
                  ) : page === "advertisers" ? (
                    <Advertisers {...context} />
                  ) : (
                    <Intelligence {...context} />
                  )),
              )}
              {translateText(
                role === "airline" &&
                  (page === "flights" ? (
                    <Flights {...context} />
                  ) : page === "messaging" ? (
                    <Messaging {...context} />
                  ) : page === "partners" ? (
                    <Partners {...context} />
                  ) : (
                    <Audience {...context} />
                  )),
              )}
              {role === "passenger" && <Passenger {...context} />}
            </div>
          </div>
          <footer>
            <span>
              <span className="dot green" />
              {translateText(
                "All data is synthetic. Audience profiles are aggregate estimates.",
              )}
            </span>
            <span>
              {translateText("MQI \u00B7 presence-1.0 ")}
              <span className="footer-separator">{translateText("/")}</span>
              {translateText(" ")}
              {translateText("Evidence-first by design ")}
              <ShieldCheck size={12} />
            </span>
          </footer>
        </main>
      </div>
      {translateText(
        toast && (
          <div role="status" className="toast">
            <CheckCircle2 size={18} />
            {translateText(toast)}
            <button
              aria-label={translateText("Dismiss notification")}
              onClick={() => setToast("")}
            >
              <X size={14} />
            </button>
          </div>
        ),
      )}
      {translateText(
        modal && (
          <div
            className="modal-backdrop"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModal(null);
            }}
          >
            <section
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={modal.type}
              className={`modal ${modal.type === "campaign" ? "wide" : ""}`}
              tabIndex={-1}
            >
              <button
                className="modal-close"
                aria-label={translateText("Close dialog")}
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
              {translateText(
                modal.type === "campaign" ? (
                  <CampaignBuilder
                    {...context}
                    close={() => setModal(null)}
                    messaging={modal.messaging}
                  />
                ) : modal.type === "event" ? (
                  <EventForm {...context} close={() => setModal(null)} />
                ) : modal.type === "settings" ? (
                  <Settings {...context} />
                ) : modal.type === "screen" ? (
                  <ScreenDetail {...context} id={modal.id} />
                ) : modal.type === "entity" ? (
                  <EntityForm
                    {...context}
                    kind={modal.kind}
                    value={modal.value}
                    close={() => setModal(null)}
                  />
                ) : modal.type === "override" ? (
                  <Override {...context} close={() => setModal(null)} />
                ) : null,
              )}
            </section>
          </div>
        ),
      )}
    </div>
  );
}

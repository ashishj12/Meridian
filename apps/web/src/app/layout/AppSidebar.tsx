import { translateText } from "../../i18n/index";
import {
  ArrowUpRight,
  ChevronDown,
  Layers3,
  Monitor,
  Plane,
  Settings2,
} from "lucide-react";
import { roleMenus } from "../navigation";
import type {
  ApiRecord,
  WorkspaceShellProps,
} from "../../shared/types/workspace";

/** AppSidebar renders shared navigation only; state changes are delegated to the application. */
export function AppSidebar(props: WorkspaceShellProps) {
  const {
    state,
    role,
    page,
    t,
    setPage,
    switchRole,
    setWelcome,
    split,
    setSplit,
    setModal,
  } = props;
  return (
    <aside className="sidebar">
      <a
        href="/"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          history.pushState({}, "", "/");
          setWelcome(true);
        }}
      >
        <div className="brandmark">
          {translateText(state.config.theme.logo)}
        </div>
        <div>
          {translateText(
            state.config.theme.name === "MERIDIAN"
              ? "meridian."
              : state.config.theme.name,
          )}
          <small>
            {translateText(
              role === "admin"
                ? "Airport operations"
                : "AIRPORT RETAIL INTELLIGENCE",
            )}
          </small>
        </div>
      </a>
      <div className="airport">
        <div className="airport-icon">
          <Plane size={20} />
        </div>
        <span>
          {translateText("Meridian International")}
          <small>{translateText("MQI \u00B7 Airport workspace")}</small>
        </span>
        <ChevronDown size={14} />
      </div>
      <div className="nav-caption">{translateText("WORKSPACE")}</div>
      <nav>
        {roleMenus[role].map(([key, Icon]: any) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            onClick={() => setPage(key)}
          >
            <Icon size={18} />
            {translateText(t(key))}
            {translateText(
              key === "incidents" && (
                <span className="count">
                  {translateText(
                    state.incidents.filter(
                      (i: ApiRecord) => i.status !== "resolved",
                    ).length,
                  )}
                </span>
              ),
            )}
          </button>
        ))}
      </nav>
      <div className="nav-caption second-caption">
        {translateText("CONNECTED EXPERIENCES")}
      </div>
      <button className="sidebar-link" onClick={() => switchRole("passenger")}>
        <Monitor size={18} />
        {translateText("Screen simulator")}
        <ArrowUpRight size={14} />
      </button>
      <button
        className={`sidebar-link ${split ? "selected" : ""}`}
        onClick={() => setSplit(!split)}
      >
        <Layers3 size={18} />
        {translateText(t("demo"))}
        <span className="tiny-tag">{translateText("LIVE")}</span>
      </button>
      <div className="sidebar-bottom">
        <div className="network-state">
          <span className="dot green" />
          <span>
            {translateText("All systems operational")}
            <small>
              {translateText(
                state.feeds.filter((f: ApiRecord) => f.status === "healthy")
                  .length,
              )}
              {translateText(" of 3 feeds connected")}
            </small>
          </span>
        </div>
        <button
          className="profile"
          onClick={() => setModal({ type: "settings" })}
        >
          <span className="avatar">{translateText("MO")}</span>
          <span>
            {translateText("Meridian Operations")}
            <small>{translateText("Demo workspace")}</small>
          </span>
          <Settings2 size={17} />
        </button>
      </div>
    </aside>
  );
}

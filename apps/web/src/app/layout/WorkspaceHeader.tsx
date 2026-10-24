import { translateText } from "../../i18n/index";
import { ChevronDown, ChevronRight, Globe2, Search } from "lucide-react";
import type { WorkspaceShellProps } from "../../shared/types/workspace";

/** WorkspaceHeader renders shared navigation only; state changes are delegated to the application. */
export function WorkspaceHeader(props: WorkspaceShellProps) {
  const { state, role, live, lang, setLang, search, setSearch, switchRole, t } =
    props;
  return (
    <header>
      <div className="breadcrumb">
        {translateText("Workspace ")}
        <ChevronRight size={13} />
        <b>{translateText(t(role))}</b>
      </div>
      <div className="header-actions">
        <div className="global-search">
          <Search size={13} />
          <input
            aria-label={translateText("Search airport screens")}
            placeholder={translateText("Search screen, gate or zone\u2026")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={`connection ${live.connected ? "" : "disconnected"}`}>
          <span className="dot" />
          {translateText(live.connected ? t("live") : "Reconnecting")}
        </span>
        <button
          className="language"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          <Globe2 size={15} />
          {translateText(lang === "en" ? "EN" : "हिन्दी")}
        </button>
        <div className="role-select">
          <span className="avatar small">
            {translateText(
              role === "admin" ? "MO" : role.slice(0, 2).toUpperCase(),
            )}
          </span>
          <select
            aria-label={translateText("Role")}
            value={role}
            onChange={(e) => switchRole(e.target.value)}
          >
            {["admin", "retailer", "media", "airline", "passenger"].map((r) => (
              <option key={r} value={r}>
                {translateText(t(r))}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
      </div>
    </header>
  );
}

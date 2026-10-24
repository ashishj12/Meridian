import { translateText } from "../../../i18n/index";
import { useState } from "react";
import type { WorkspaceContext } from "../../../shared/types/workspace";

export function Settings(context: WorkspaceContext) {
  const [name, setName] = useState(context.state.config.theme.name);
  const [accent, setAccent] = useState(context.state.config.theme.accent);
  const [logo, setLogo] = useState(context.state.config.theme.logo);
  const [appearance, setAppearance] = useState(
    context.state.config.adminAppearance || "dark",
  );
  const [fill, setFill] = useState(
    context.state.config.forecastFillRate ?? 0.35,
  );
  return (
    <>
      <h2>{translateText("Your airport. Your identity.")}</h2>
      <p className="muted">
        {translateText(
          "White-label theme configuration persists across all experiences.",
        )}
      </p>
      <label>
        {translateText("Product name")}
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {translateText("Monogram")}
        <input
          maxLength={8}
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
        />
      </label>
      <label>
        {translateText("Accent")}
        <input
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
        />
      </label>
      <label>
        {translateText("Admin appearance")}
        <select
          value={appearance}
          onChange={(event) => setAppearance(event.target.value)}
        >
          <option value="dark">{translateText("Dark")}</option>
          <option value="light">{translateText("Light")}</option>
        </select>
      </label>
      <label>
        {translateText("Expected inventory fill rate")}
        <input
          type="number"
          min="0"
          max="100"
          value={Math.round(fill * 100)}
          onChange={(event) => setFill(Number(event.target.value) / 100)}
        />
      </label>
      <button
        className="primary"
        onClick={() =>
          context
            .action(
              "/config",
              {
                theme: { name, accent, logo },
                adminAppearance: appearance,
                forecastFillRate: fill,
              },
              "PATCH",
            )
            .then(() => context.notify("Brand configuration saved."))
        }
      >
        {translateText("Save theme")}
      </button>
    </>
  );
}

import { translateText } from "../../../i18n/index";
import { AdArt } from "./CampaignArtwork";
import type { ApiRecord } from "../../../shared/types/workspace";

interface MockScreenPreviewProps {
  creative: ApiRecord;
  screen?: ApiRecord;
  language: string;
  onLanguageChange: (language: string) => void;
}

export function MockScreenPreview({
  creative,
  screen,
  language,
  onLanguageChange,
}: MockScreenPreviewProps) {
  const secondLanguage = creative.secondLanguage || "hi";
  const languages = [...new Set(["en", secondLanguage])];
  return (
    <div className="mock-screen-preview">
      <div className="mock-screen-toolbar">
        <span>
          {translateText("MOCK SCREEN")} · {screen?.id || "S124"} ·{" "}
          {translateText("GATE")} {screen?.gate || "42"}
        </span>
        <label>
          {translateText("Preview language")}
          <select
            aria-label={translateText("Preview language")}
            value={languages.includes(language) ? language : "en"}
            onChange={(event) => onLanguageChange(event.target.value)}
          >
            {languages.map((item) => (
              <option value={item} key={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mock-screen-bezel">
        <AdArt campaign={creative} lang={language} />
      </div>
      <p className="mock-screen-template">
        {creative.adPage?.templateId ||
          translateText("Ready-to-edit screen ad")}
      </p>
    </div>
  );
}

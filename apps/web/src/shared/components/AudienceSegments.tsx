import { translateText } from "../../i18n/index";
import { percent } from "../lib/format";

export function SegmentBars({ presence }: any) {
  return (
    <div className="segment-bars">
      {["holiday", "family", "business", "international"].map((key, i) => (
        <div key={key}>
          <div>
            <span>
              {translateText(
                key === "family"
                  ? "Families"
                  : key.charAt(0).toUpperCase() + key.slice(1),
              )}
            </span>
            <b>{translateText(percent(presence?.segments?.[key]))}</b>
          </div>
          <span className="bar-track">
            <i
              style={{
                width: percent(presence?.segments?.[key]),
                background: ["#6c8fff", "#9c82e9", "#62b9b2", "#d5ad70"][i],
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

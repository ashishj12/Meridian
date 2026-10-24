import { translateText } from "../../../i18n/index";
import { ArrowUpRight, Plane } from "lucide-react";

export function AdArt({ campaign: c, lang, mini = false }: any) {
  return (
    <div
      className={`ad-art ${mini ? "mini" : ""}`}
      style={{ background: c.color || "#d8bea0" }}
    >
      {translateText(
        c.image ? (
          <img src={c.image} alt="Campaign creative" />
        ) : (
          <>
            <div className="ad-grain" />
            <div className="ad-arc" />
            {translateText(
              c.category === "toys" ? (
                <div className="toy-scene">
                  <div>{translateText("F")}</div>
                  <div>{translateText("L")}</div>
                  <div>{translateText("Y")}</div>
                  <Plane size={50} strokeWidth={1} />
                </div>
              ) : ["coffee", "goodwill"].includes(c.category) ? (
                <div className="coffee-scene">
                  <div className="coffee-cup">
                    <span>
                      {translateText("JUNIPER")}
                      <small>{translateText("A WARMER MOMENT")}</small>
                    </span>
                  </div>
                  <div className="coffee-saucer" />
                </div>
              ) : c.category === "sweets" ? (
                <div className="gift-scene">
                  <div className="gift-ribbon" />
                  <span>
                    {translateText("SAFFRON")}
                    <small>{translateText("A LITTLE SWEETNESS")}</small>
                  </span>
                </div>
              ) : c.category === "information" ? (
                <Plane
                  className="information-plane"
                  size={140}
                  strokeWidth={0.7}
                />
              ) : (
                <div className="bottle">
                  <div className="bottle-cap" />
                  <div className="bottle-glass">
                    <span>
                      {translateText("AURELIA")}
                      <small>{translateText("EAU DE VOYAGE")}</small>
                    </span>
                  </div>
                  <div className="bottle-shadow" />
                </div>
              ),
            )}
          </>
        ),
      )}
      <div className="ad-copy">
        <span className="ad-brand">
          {translateText(
            c.category === "information"
              ? "MERIDIAN"
              : c.category === "sweets"
                ? "SAFFRON"
                : c.category === "coffee"
                  ? "JUNIPER"
                  : c.category === "toys"
                    ? "LITTLE ORBIT"
                    : c.category === "goodwill"
                      ? "JUNIPER × SKYLARK"
                      : c.category === "lounge"
                        ? "ALTITUDE"
                        : "AURELIA",
          )}
          <small>{translateText("THE ART OF A BETTER JOURNEY")}</small>
        </span>
        <h2>
          {translateText(
            lang === "hi" && c.headlineHi ? c.headlineHi : c.headline,
          )}
        </h2>
        <p>{translateText(c.offer)}</p>
        <span className="ad-cta">
          {translateText(
            lang === "hi"
              ? "स्कैन करें। ऑफर पाएँ।"
              : "A little discovery. Before departure.",
          )}
          <ArrowUpRight size={15} />
        </span>
      </div>
    </div>
  );
}

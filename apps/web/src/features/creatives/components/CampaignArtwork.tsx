import { translateText } from "../../../i18n/index";
import { ArrowUpRight, Plane } from "lucide-react";

export function AdArt({ campaign: c, lang, mini = false }: any) {
  const translated = lang === c.secondLanguage;
  const headline =
    translated && c.headlineSecond
      ? c.headlineSecond
      : lang === "hi" && c.headlineHi
        ? c.headlineHi
        : c.headline;
  const offer =
    translated && c.offerSecond
      ? c.offerSecond
      : lang === "hi" && c.offerHi
        ? c.offerHi
        : c.offer;
  const copy = translated && c.copySecond ? c.copySecond : c.copy || offer;
  const cta =
    translated && c.ctaSecond
      ? c.ctaSecond
      : lang === "hi"
        ? "स्कैन करें। ऑफर पाएँ।"
        : c.cta || "A little discovery. Before departure.";
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
              ) : c.category === "fashion" ? (
                <div className="fashion-scene">
                  <div />
                  <span>MERIDIAN EDIT</span>
                </div>
              ) : c.category === "food" ? (
                <div className="food-scene">
                  <div className="food-plate">
                    <span />
                  </div>
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
            c.adPage?.brand ||
              (c.category === "information"
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
                          : "AURELIA"),
          )}
          <small>{translateText("THE ART OF A BETTER JOURNEY")}</small>
        </span>
        <h2>{translateText(headline)}</h2>
        <p>{translateText(copy)}</p>
        {c.copy && <span className="ad-offer">{translateText(offer)}</span>}
        <span className="ad-cta">
          {translateText(cta)}
          <ArrowUpRight size={15} />
        </span>
      </div>
    </div>
  );
}

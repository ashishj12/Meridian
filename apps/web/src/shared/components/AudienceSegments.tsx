import { translateText } from "../../i18n/index";
import { percent } from "../lib/format";

export function SegmentBars({ presence }: any) {
  const groups = [
    {
      title: "Gender split",
      values: presence?.gender,
      labels: { female: "Female", male: "Male" },
    },
    {
      title: "Cabin tier",
      values: presence?.cabin,
      labels: {
        economy: "Economy",
        premiumEconomy: "Premium economy",
        business: "Business",
      },
    },
    {
      title: "Age bands",
      values: presence?.age,
      labels: Object.fromEntries(
        ["<12", "12–17", "18–24", "25–34", "35–44", "45–54", "55+"].map(
          (age) => [age, age],
        ),
      ),
    },
  ];
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
      {groups.map(({ title, values, labels }) => (
        <section className="profile-bar-group" key={title}>
          <h4>{translateText(title)}</h4>
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <div>
                <span>{translateText(label)}</span>
                <b>{translateText(percent(values?.[key]))}</b>
              </div>
              <span className="bar-track">
                <i style={{ width: percent(values?.[key]) }} />
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

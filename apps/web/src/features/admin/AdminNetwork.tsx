import { translateText } from "../../i18n/index";

type ApiRecord = Record<string, any>;
/** Native-sized labels and interactive screen buttons avoid scaling map text with an SVG. */
export default function AdminNetwork({
  state,
  terminal,
  query = "",
  onSelect,
}: any) {
  const terminals = terminal === "All" ? ["T1", "T2"] : [terminal];
  return (
    <div
      className="admin-network"
      role="region"
      aria-label={translateText("Airport screen map")}
    >
      <div className="network-summary">
        <span>
          {translateText(state.screens.length)}
          {translateText(" screen placements \u00B7 ")}
          {translateText(
            new Set(state.screens.map((sc: ApiRecord) => sc.zoneId)).size,
          )}
          {translateText(" zones")}
        </span>
        <span className="network-focus">
          {translateText("Gate 42 ")}
          <b>
            {translateText(state.presence.Z7.count)}
            {translateText(" estimated passengers")}
          </b>
        </span>
      </div>
      <div className="network-terminals">
        {terminals.map((term: string) => (
          <section
            className="network-terminal"
            key={term}
            aria-label={`${term} screen placements`}
          >
            <div className="terminal-title">
              <b>{translateText(term)}</b>
              <span>
                {translateText(term === "T1" ? "Domestic" : "International")}
              </span>
              <small>
                {translateText(
                  state.screens.filter(
                    (sc: ApiRecord) =>
                      sc.terminal === term && sc.status === "online",
                  ).length,
                )}
                {translateText(" ")}
                {translateText("online")}
              </small>
            </div>
            <div className="network-zones">
              {translateText(
                Array.from({ length: 5 }, (_, index) => {
                  const zone = index + (term === "T1" ? 1 : 6);
                  const screens = state.screens.filter(
                    (sc: ApiRecord) => sc.zoneId === `Z${zone}`,
                  );
                  const count = state.presence[`Z${zone}`]?.count || 0;
                  return (
                    <div
                      className={`network-zone ${zone === 7 ? "focus-zone" : ""}`}
                      key={zone}
                    >
                      <div className="zone-title">
                        <b>
                          {translateText(term === "T1" ? "D" : "I")}
                          {translateText(index + 1)}
                        </b>
                        <span>
                          {translateText("G")}
                          {translateText(
                            String((zone - 1) * 6 + 1).padStart(2, "0"),
                          )}
                          {translateText("\u2013")}
                          {translateText(String(zone * 6).padStart(2, "0"))}
                        </span>
                      </div>
                      <div className="zone-screens">
                        {screens.map((sc: ApiRecord) => {
                          const matches =
                            !query ||
                            JSON.stringify(sc)
                              .toLowerCase()
                              .includes(query.toLowerCase());
                          return (
                            <button
                              key={sc.id}
                              className={`network-screen ${sc.status} ${sc.id === "S124" ? "focus-screen" : ""} ${matches ? "" : "unmatched"}`}
                              aria-label={`${sc.id} ${sc.status} gate ${sc.gate}`}
                              title={`${sc.id} · Gate ${sc.gate} · ${sc.status}`}
                              onClick={() => onSelect(sc.id)}
                              disabled={!matches}
                            >
                              <span />
                            </button>
                          );
                        })}
                      </div>
                      <div
                        className="zone-density"
                        aria-label={`${count} estimated passengers in zone ${zone}`}
                      >
                        <i style={{ width: `${Math.min(100, count / 6)}%` }} />
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { translateText } from "../../i18n/index";

type ApiRecord = Record<string, any>;
export default function AdminNetwork({
  state,
  terminal,
  query = "",
  onSelect,
}: any) {
  const positions = Array.from({ length: 10 }, (_, index) => {
    const terminalOffset = index < 5 ? 30 : 530;
    const terminalIndex = index % 5;
    return {
      zone: index + 1,
      x: terminalOffset + 24 + (terminalIndex % 3) * 132,
      y: 128 + Math.floor(terminalIndex / 3) * 124,
    };
  });
  const statusColor: Record<string, string> = {
    online: "#438b61",
    degraded: "#d3942e",
    offline: "#d65f58",
  };
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
      <div className="network-map-scroll">
        <svg
          className="network-floorplan"
          viewBox="0 0 1000 390"
          role="img"
          aria-label={translateText(
            "T1 and T2 floor plan with passenger presence heat and screen health",
          )}
        >
          <path className="floor-terminal"           d="M22 68 50 48h425l27 22v310H22z" />
          <path
            className="floor-terminal"
            d="m523 70 27-22h425l25 20v310H523z"
          />
          <path className="floor-connector" d="M489 192h22" />
          <text className="floor-terminal-label" x="48" y="88">
            {translateText("T1 · DOMESTIC")}
          </text>
          <text className="floor-terminal-label" x="548" y="88">
            {translateText("T2 · INTERNATIONAL")}
          </text>
          <text className="floor-connector-label" x="486" y="175">
            {translateText("LINK")}
          </text>
          {positions.map(({ zone, x, y }) => {
            const zoneId = `Z${zone}`;
            const zoneScreens = state.screens.filter(
              (screen: ApiRecord) => screen.zoneId === zoneId,
            );
            const count = state.presence[zoneId]?.count || 0;
            const terminalMatch =
              terminal === "All" || terminal === (zone <= 5 ? "T1" : "T2");
            const heat = Math.min(0.58, 0.12 + count / 2600);
            return (
              <g
                key={zoneId}
                className={`floor-zone ${zone === 7 ? "focus-zone" : ""}`}
                opacity={terminalMatch ? 1 : 0.22}
                aria-label={`${zoneId}, ${count} estimated passengers`}
              >
                <rect
                  x={x}
                  y={y}
                  width="120"
                  height="106"
                  rx="10"
                  className="floor-zone-base"
                />
                <rect
                  x={x}
                  y={y}
                  width="120"
                  height="106"
                  rx="10"
                  fill="#4b9e78"
                  fillOpacity={heat}
                />
                <text className="floor-zone-name" x={x + 10} y={y + 20}>
                  {translateText(
                    `${zone <= 5 ? "D" : "I"}${zone <= 5 ? zone : zone - 5}`,
                  )}
                </text>
                <text className="floor-gates" x={x + 10} y={y + 35}>
                  {translateText("G")}
                  {String((zone - 1) * 6 + 1).padStart(2, "0")}
                  {translateText("–")}
                  {String(zone * 6).padStart(2, "0")}
                  {translateText(" · ")}
                  {translateText(fmtCount(count))}
                  {translateText(" pax")}
                </text>
                {zoneScreens.map((screen: ApiRecord, index: number) => {
                  const matches =
                    !query ||
                    JSON.stringify(screen)
                      .toLowerCase()
                      .includes(query.toLowerCase());
                  const cx = x + 16 + (index % 6) * 17;
                  const cy = y + 58 + Math.floor(index / 6) * 15;
                  return (
                    <g
                      key={screen.id}
                      role="button"
                      aria-label={`${screen.id} ${screen.status} gate ${screen.gate}`}
                      tabIndex={matches ? 0 : -1}
                      className={`floor-screen ${screen.id === "S124" ? "focus-screen" : ""}`}
                      opacity={matches ? 1 : 0.15}
                      onClick={() => matches && onSelect(screen.id)}
                      onKeyDown={(event) => {
                        if (
                          matches &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          onSelect(screen.id);
                        }
                      }}
                    >
                      <title>
                        {`${screen.id} · Gate ${screen.gate} · ${screen.status}`}
                      </title>
                      <circle
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill={statusColor[screen.status] || "#687b70"}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const fmtCount = (count: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);

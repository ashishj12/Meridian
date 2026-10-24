import { translateText } from "../../i18n/index";
import { time } from "../lib/format";
import type { ApiRecord } from "../types/workspace";

export function FlowChart({ presence }: any) {
  const data = presence.forecasts || [];
  const max = Math.max(1, ...data.map((v: ApiRecord) => v.count));
  const points = data
    .map(
      (v: ApiRecord, i: number) => `${i * 100},${130 - (v.count / max) * 110}`,
    )
    .join(" ");
  return (
    <div className="flow-chart">
      <svg
        viewBox="0 0 700 165"
        aria-label={translateText(
          "Estimated passenger footfall over the next two hours",
        )}
        role="img"
      >
        <defs>
          <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#5c8cfa" stopOpacity=".23" />
            <stop offset="1" stopColor="#5c8cfa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 75, 130].map((y) => (
          <line
            key={y}
            x1="0"
            x2="700"
            y1={y}
            y2={y}
            stroke="currentColor"
            opacity=".08"
          />
        ))}
        <polygon points={`0,140 ${points} 700,140`} fill="url(#flowFill)" />
        <polyline
          points={points}
          stroke="#6292ff"
          fill="none"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {data.map((v: ApiRecord, i: number) => (
          <g key={i}>
            <circle
              cx={i * 100}
              cy={130 - (v.count / max) * 110}
              r="3"
              fill="#6292ff"
            />
            <text
              x={i * 100}
              y="160"
              textAnchor={i === 0 ? "start" : i === 7 ? "end" : "middle"}
              fill="currentColor"
              opacity=".5"
              fontSize="11"
            >
              {translateText(time(v.time))}
            </text>
          </g>
        ))}
      </svg>
      <span className="footnote">
        {translateText(
          "Flight schedule forecast \u00B7 15-minute windows \u00B7 model-estimated, not measured traffic",
        )}
      </span>
    </div>
  );
}

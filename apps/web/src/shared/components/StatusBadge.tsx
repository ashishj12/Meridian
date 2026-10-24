import { translateText } from "../../i18n/index";

export function Badge({ value }: any) {
  return (
    <span
      className={`badge ${/approved|online|healthy|accepted|Scheduled|resolved/i.test(value) ? "success" : /pending|degraded|Delayed|investigating/i.test(value) ? "warning" : /offline|rejected|Cancelled|high|critical/i.test(value) ? "danger" : "neutral"}`}
    >
      <span className="dot" />
      {translateText(value)}
    </span>
  );
}

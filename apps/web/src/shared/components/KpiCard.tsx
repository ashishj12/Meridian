import { translateText } from "../../i18n/index";
import { Activity } from "lucide-react";

export function KPI({
  label,
  value,
  sub,
  icon: Icon = Activity,
  tone = "blue",
}: any) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{translateText(label)}</span>
        <Icon size={16} />
      </div>
      <div className="kpi-value">{translateText(value)}</div>
      <div className={`kpi-sub ${tone}`}>
        <span className="dot" />
        {translateText(sub)}
      </div>
    </div>
  );
}

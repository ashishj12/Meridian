import { translateText } from "../../i18n/index";
import { Layers3 } from "lucide-react";

export function Empty({ text }: any) {
  return (
    <div className="empty">
      <Layers3 size={28} />
      <p>{translateText(text)}</p>
    </div>
  );
}

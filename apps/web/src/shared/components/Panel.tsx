import { translateText } from "../../i18n/index";

export function Panel({ title, tag, actions, children, className = "" }: any) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>
          {translateText(title)}
          {tag && <span className="tiny-tag">{translateText(tag)}</span>}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

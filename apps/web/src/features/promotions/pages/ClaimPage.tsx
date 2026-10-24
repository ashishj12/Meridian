import { translateText } from "../../../i18n/index";
import { useState, useEffect, useRef } from "react";
import { ArrowUpRight, ShieldCheck, Users } from "lucide-react";
import { api } from "../../../shared/api/client";
import { time } from "../../../shared/lib/format";
import type { ApiRecord } from "../../../shared/types/workspace";

export function Claim({ token, lang }: any) {
  const [familyUrl, setFamilyUrl] = useState("");
  const [p, setP] = useState<ApiRecord | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const scanned = useRef(false);
  const activeToken = useRef(token);
  const refresh = () =>
    api("/promos/" + activeToken.current)
      .then(setP)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (!scanned.current) {
      scanned.current = true;
      api("/promos/" + token + "/scan", { issue: true })
        .then((r) => {
          activeToken.current = r.id;
          refresh();
        })
        .catch((e) => setError(e.message));
    } else refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [token]);
  const act = async (action: string) => {
    try {
      const r = await api("/promos/" + activeToken.current + "/" + action, {});
      if (action === "share") {
        const url = location.origin + "/claim/" + r.id;
        setFamilyUrl(url);
        if (navigator.share)
          await navigator.share({ title: "A moment for your family", url });
        else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          setMessage("Family offer link copied.");
        } else setMessage("Family offer link ready to share.");
      } else {
        setP({ ...p, ...r });
        setMessage(
          action === "redeem"
            ? "Offer redeemed. Enjoy your journey."
            : "Offer claimed. Show it at the store.",
        );
      }
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="claim-page">
      <div className="claim-brand">
        <div className="brandmark">{translateText("M")}</div>
        {translateText("meridian.")}
        {translateText(" ")}
        <small>{translateText("YOUR JOURNEY, MADE BETTER")}</small>
      </div>
      <div className="claim-card">
        <span className="badge success">
          <ShieldCheck size={13} />
          {translateText("Verified airport offer")}
        </span>
        <h1>
          {translateText(
            (lang === "hi" ? p?.campaign?.headlineHi : p?.campaign?.headline) ||
              "A little something for your journey.",
          )}
        </h1>
        <div className="claim-offer">
          {translateText(
            (lang === "hi" ? p?.offerHi : p?.offer) ||
              p?.offer ||
              "Loading your offer…",
          )}
        </div>
        <p>
          {translateText("Valid until ")}
          {translateText(p ? time(p.expiry) : "—")}
          {translateText(" UTC, simulation time.")}
          <br />
          {translateText("No personal information needed.")}
        </p>
        {translateText(
          p && (
            <>
              <div className="claim-code">
                {translateText(activeToken.current.slice(0, 8).toUpperCase())}
              </div>
              <button
                className="primary"
                disabled={p.claimed || p.expiry <= p.now}
                onClick={() => act("claim")}
              >
                {translateText(
                  p.claimed ? "Offer claimed ✓" : "Claim my offer",
                )}
              </button>
              <button
                disabled={!p.claimed || p.redeemed || p.expiry <= p.now}
                onClick={() => act("redeem")}
              >
                {translateText(
                  p.redeemed ? "Redeemed ✓" : "Use offer · demo redemption",
                )}
              </button>
              <button
                disabled={!!p.parentToken || !!p.childToken}
                onClick={() => act("share")}
              >
                <Users size={16} />
                {translateText("Share a second code with family")}
              </button>
            </>
          ),
        )}
        {translateText(
          familyUrl && (
            <label>
              {translateText("Family offer link")}
              <input
                aria-label={translateText("Family offer link")}
                readOnly
                value={familyUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
          ),
        )}
        <p className="footnote">
          {translateText(
            "Demo redemption records a simulated $24 transaction. A scan alone is not a purchase.",
          )}
        </p>
        {translateText(
          message && (
            <div className="success-message" role="status">
              {translateText(message)}
            </div>
          ),
        )}
        {translateText(
          error && (
            <div className="form-error" role="alert">
              {translateText(error)}
            </div>
          ),
        )}
        <a href="/retailer">
          {translateText("Open retailer analytics ")}
          <ArrowUpRight size={13} />
        </a>
      </div>
      <span>
        {translateText(
          "Synthetic airport \u00B7 English / \u0939\u093F\u0928\u094D\u0926\u0940",
        )}
      </span>
    </div>
  );
}

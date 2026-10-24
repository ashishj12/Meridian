import { hindi } from "./catalogs/hi";

let locale = "en";
export function setLocale(language: string) {
  locale = language === "hi" ? "hi" : "en";
}
export function getLocale() {
  return locale;
}
/** Translate presentation text only. Objects, numbers, IDs and business-rule values are untouched. */
export function translateText<T>(value: T): T | string {
  if (locale !== "hi" || typeof value !== "string") return value;
  const key = value.replace(/\s+/g, " ").trim();
  if (hindi[key]) return value.replace(value.trim(), hindi[key]);
  return value
    .replace(/(\d+) estimated passengers/g, "$1 अनुमानित यात्री")
    .replace(/(\d+) min dwell/g, "$1 मिनट ठहराव")
    .replace(/(\d+) of (\d+) screens/g, "$2 में से $1 स्क्रीन")
    .replace(/Gate (\d+)/g, "गेट $1")
    .replace(/(\d+)% expected fill/g, "$1% अपेक्षित बुकिंग")
    .replace(/Committed /g, "बुकिंग से आय ")
    .replace(
      /matches (\d+)% of this estimated audience/g,
      "इन अनुमानित दर्शकों से $1% मेल खाता है",
    )
    .replace(
      /with a ([0-9.]+)× verified delay boost/g,
      "सत्यापित विलंब से $1× अतिरिक्त भार",
    )
    .replace(
      /with a ([0-9.]+)× festival calendar boost/g,
      "उत्सव कैलेंडर से $1× अतिरिक्त भार",
    )
    .replace(/(\d+) open incidents?/g, "$1 खुली घटनाएँ");
}

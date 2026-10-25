export const fmt = (n = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

export const money = (n = 0, c = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(n);

export const time = (t: any) =>
  new Date(t).toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
export const percent = (v = 0) => `${Math.round(v * 100)}%`;

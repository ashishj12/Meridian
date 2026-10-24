import os from "node:os";

export function publicBase(req) {
  if (process.env.PUBLIC_BASE_URL)
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((a) => a.family === "IPv4" && !a.internal)?.address;
  return `http://${lan || "127.0.0.1"}:${process.env.PUBLIC_PORT || 5173}`;
}

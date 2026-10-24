/** Bounded upstream requests. No endpoint can be supplied by an API caller. */
export async function requestText(
  url,
  {
    method = "GET",
    body,
    token,
    signal,
    timeoutMs = 10000,
    fetchImplementation = fetch,
  } = {},
) {
  if (!url) throw new Error("Upstream endpoint is not configured");
  if (!["http:", "https:"].includes(new URL(url).protocol))
    throw new Error("Upstream endpoint must use HTTP or HTTPS");
  const response = await fetchImplementation(url, {
    method,
    headers: {
      Accept: "application/json, text/csv, application/xml",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok)
    throw new Error(`Upstream request failed (${response.status})`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024)
        throw new Error("Upstream payload exceeds 2 MB");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}

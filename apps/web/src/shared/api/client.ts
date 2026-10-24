export const api = async (url: string, body?: any, method = "POST") => {
  const r = await fetch(
    "/api" + url,
    body !== undefined
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (r.status === 204) return null;
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
};

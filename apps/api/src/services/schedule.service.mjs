const DAY_MS = 86400000;
const hash = (text) =>
  [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
/** A deterministic synthetic forward schedule with date/route variation, rather than a repeated day. */
export function scheduleForDate(flights, timestamp) {
  const targetDay = Math.floor(timestamp / DAY_MS) * DAY_MS;
  const date = new Date(targetDay).toISOString().slice(0, 10);
  const weekend = [0, 6].includes(new Date(targetDay).getUTCDay());
  return flights.map((flight) => {
    const seed = hash(`${date}:${flight.number}`);
    const original = Date.parse(flight.scheduled);
    const minuteOfDay =
      ((original % DAY_MS) + ((seed % 25) - 12) * 60000 + DAY_MS) % DAY_MS;
    const scheduled = new Date(targetDay + minuteOfDay).toISOString();
    const demand = (weekend ? 1.04 : 0.96) + ((seed % 19) - 9) / 100;
    const passengers = Math.max(
      0,
      Math.min(flight.seats, Math.round(flight.pax * demand)),
    );
    const segments = {
      ...flight.profile,
      business: Math.min(
        1,
        (flight.profile.business || 0) * (weekend ? 0.72 : 1.08),
      ),
      family: Math.min(
        1,
        (flight.profile.family || 0) * (weekend ? 1.2 : 0.95),
      ),
      holiday: Math.min(
        1,
        (flight.profile.holiday || 0) * (weekend ? 1.12 : 0.97),
      ),
    };
    return {
      ...flight,
      pax: passengers,
      scheduled,
      estimated: scheduled,
      delay: 0,
      status: "Scheduled",
      profile: segments,
      forecastSource: "synthetic-forward-schedule-v2",
    };
  });
}
/** Full canonical data, never the eighty-row dashboard preview. */
export function segmentHeatmap(runtime, segment, date) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid heatmap date");
  const currentDate = new Date(runtime.clock.time).toISOString().slice(0, 10);
  const flights =
    date === currentDate
      ? runtime.store.all("flights")
      : scheduleForDate(runtime.store.all("flights"), timestamp);
  const hours = [8, 10, 12, 14, 16, 18, 20];
  return {
    date,
    segment,
    sourceCount: flights.length,
    hours,
    rows: runtime.store.all("zones").map((zone) => ({
      zoneId: zone.id,
      values: Object.fromEntries(
        hours.map((hour) => [
          hour,
          Math.round(
            flights
              .filter(
                (flight) =>
                  flight.zoneId === zone.id &&
                  Math.abs(new Date(flight.estimated).getUTCHours() - hour) < 2,
              )
              .reduce(
                (total, flight) =>
                  total + flight.pax * (flight.profile?.[segment] || 0),
                0,
              ),
          ),
        ]),
      ),
    })),
  };
}
export function sevenDayYield(runtime) {
  const bucket = Math.floor(runtime.clock.time / 900000);
  if (runtime.yieldCache?.bucket === bucket) return runtime.yieldCache.value;
  const start = Math.floor(runtime.clock.time / DAY_MS) * DAY_MS + DAY_MS;
  const end = start + 7 * DAY_MS;
  const screens = runtime.store
    .all("screens")
    .filter((screen) => screen.status !== "offline");
  const bookings = runtime.store
    .all("bookings")
    .filter((booking) => booking.timestamp >= start && booking.timestamp < end);
  const committedRevenue = bookings.reduce(
    (total, booking) => total + booking.price,
    0,
  );
  const booked = new Set(
    bookings.map((booking) => `${booking.screenId}:${booking.timestamp}`),
  );
  let availableSlotValue = 0;
  for (let day = 0; day < 7; day++)
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = start + day * DAY_MS + hour * 3600000;
      const zonePrices = new Map();
      for (const screen of screens) {
        if (booked.has(`${screen.id}:${timestamp}`)) continue;
        if (!zonePrices.has(screen.zoneId))
          zonePrices.set(
            screen.zoneId,
            runtime.quote(screen.id, timestamp).price,
          );
        availableSlotValue += zonePrices.get(screen.zoneId);
      }
    }
  const expectedFillRate =
    runtime.store.get("config", "rules").forecastFillRate ?? 0.35;
  const value = {
    start,
    end,
    committedRevenue: +committedRevenue.toFixed(2),
    availableSlotValue: +availableSlotValue.toFixed(2),
    expectedFillRate,
    revenueForecast: +(
      committedRevenue +
      availableSlotValue * expectedFillRate
    ).toFixed(2),
    method:
      "Forward schedule × dynamic slot pricing × configured fill-rate assumption. Not a revenue guarantee.",
  };
  runtime.yieldCache = { bucket, value };
  return value;
}

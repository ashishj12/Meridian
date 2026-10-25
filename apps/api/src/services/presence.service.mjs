import { calendarEvidence } from "./calendar.service.mjs";

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, value));
const iso = (timestamp) => new Date(timestamp).toISOString();
const ageBands = ["<12", "12–17", "18–24", "25–34", "35–44", "45–54", "55+"];
const genderCategories = ["female", "male"];
const cabinTiers = ["economy", "premiumEconomy", "business"];
/** Estimate aggregate zone audiences from canonical flights and queues. */
export function presenceService(
  runtime,
  zoneId,
  flights = runtime.store.all("flights"),
  atTime = runtime.clock.time,
  screen,
) {
  const time = atTime;
  const queue = runtime.store.all("queues").find((q) => q.zoneId === zoneId);
  const nearby = flights.filter(
    (f) =>
      f.zoneId === zoneId &&
      f.direction === "D" &&
      !["DEP", "CNL", "Departed", "Cancelled"].includes(f.status) &&
      Date.parse(f.estimated) > time &&
      Date.parse(f.estimated) < time + 2 * 3600000,
  );
  const entries = nearby.map((f) => {
    const estimatedDeparture = Date.parse(f.estimated);
    const sourceBoardingTime = f.tobt ? Date.parse(f.tobt) : Number.NaN;
    const boardingTime = Number.isFinite(sourceBoardingTime)
      ? sourceBoardingTime
      : estimatedDeparture - 20 * 60000;
    const timeToBoarding = Math.max(0, (boardingTime - time) / 60000);
    const dwell = Math.max(0, (estimatedDeparture - time) / 60000 - 20);
    const numericGateDistance = Math.abs(
      Number.parseInt(screen?.gate, 10) - Number.parseInt(f.gate, 10),
    );
    const gateDistance =
      screen && screen.nearestGates?.includes(f.gate)
        ? 0
        : screen
          ? Number.isFinite(numericGateDistance)
            ? numericGateDistance
            : Number.POSITIVE_INFINITY
          : 0;
    const gateWeight = screen ? 1 / (1 + gateDistance) : 1;
    const boardingWeight = clamp(timeToBoarding / 45, 0, 1);
    return {
      f,
      dwell,
      timeToBoarding,
      gateDistance,
      weight: f.pax * boardingWeight * gateWeight,
    };
  });
  const forecastFlights = nearby
    .filter((flight) => Date.parse(flight.estimated) >= time)
    .sort((a, b) => Date.parse(a.estimated) - Date.parse(b.estimated));
  const forecasts = Array.from({ length: 8 }, (_, index) => {
    const start = time + index * 15 * 60000;
    const end = start + 15 * 60000;
    return {
      time: iso(end),
      count: forecastFlights
        .filter((flight) => {
          const departure = Date.parse(flight.estimated);
          return departure >= start && departure < end;
        })
        .reduce((total, flight) => total + Math.round(flight.pax * 0.65), 0),
    };
  });
  const next60Flights = forecastFlights.filter(
    (flight) => Date.parse(flight.estimated) < time + 60 * 60000,
  );
  const next60Pax = next60Flights.reduce(
    (total, flight) => total + Math.round(flight.pax * 0.65),
    0,
  );
  const destinationTotals = new Map();
  const nationalityTotals = new Map();
  for (const flight of next60Flights) {
    const passengers = Math.round(flight.pax * 0.65);
    destinationTotals.set(
      flight.destination,
      (destinationTotals.get(flight.destination) || 0) + passengers,
    );
    flight.profile?.nationalities?.forEach((nationality, index) => {
      const share = [0.6, 0.25, 0.15][index] || 0;
      nationalityTotals.set(
        nationality,
        (nationalityTotals.get(nationality) || 0) + passengers * share,
      );
    });
  }
  const topDestinations = [...destinationTotals]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([destination]) => destination);
  const topNationalities = [...nationalityTotals]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nationality]) => nationality);
  const sum = entries.reduce((a, e) => a + e.weight, 0);
  const avg = (k) =>
    sum
      ? entries.reduce((a, e) => a + (e.f.profile?.[k] || 0) * e.weight, 0) /
        sum
      : 0;
  const distribution = (dimension, categories) =>
    Object.fromEntries(
      categories.map((category) => [
        category,
        sum
          ? +(
              entries.reduce(
                (total, entry) =>
                  total +
                  (entry.f.profile?.[dimension]?.[category] || 0) *
                    entry.weight,
                0,
              ) / sum
            ).toFixed(4)
          : 0,
      ]),
    );
  const segments = Object.fromEntries(
    [
      "holiday",
      "family",
      "business",
      "adult",
      "international",
      "premium",
      "solo",
      "couple",
      "group",
      "children",
      "frequentFlyer",
    ].map((k) => [k, +avg(k).toFixed(4)]),
  );
  const count = Math.round(sum * clamp((queue?.count || 36) / 36, 0.85, 1.15));
  return {
    id: zoneId,
    window: iso(Math.floor(time / 300000) * 300000),
    count,
    next30: entries
      .filter((e) => e.dwell < 60)
      .reduce((a, e) => a + e.f.pax, 0),
    dwell: Math.round(
      sum ? entries.reduce((a, e) => a + e.dwell * e.weight, 0) / sum : 0,
    ),
    delay: Math.max(0, ...nearby.map((f) => f.delay)),
    segments,
    forecasts,
    destinations: [...new Set(nearby.map((f) => f.destination))].slice(0, 5),
    next60: {
      pax: next60Pax,
      internationalShare: next60Pax
        ? +(
            next60Flights
              .filter((flight) => flight.international)
              .reduce(
                (total, flight) => total + Math.round(flight.pax * 0.65),
                0,
              ) / next60Pax
          ).toFixed(4)
        : 0,
      destinations: topDestinations,
      nationalities: topNationalities,
    },
    nationalities: topNationalities.length
      ? topNationalities
      : nearby[0]?.profile?.nationalities || ["Meridian"],
    languages: nearby[0]?.profile?.languages || ["English", "हिन्दी"],
    gender: distribution("gender", genderCategories),
    cabin: distribution("cabin", cabinTiers),
    age: distribution("age", ageBands),
    flightIds: nearby.map((f) => f.id),
    flightWeights: entries.map((entry) => ({
      flightId: entry.f.id,
      gateDistance: Number.isFinite(entry.gateDistance)
        ? entry.gateDistance
        : null,
      timeToBoarding: Math.round(entry.timeToBoarding),
      weight: +(entry.weight / (entry.f.pax || 1)).toFixed(4),
    })),
    queueIds: queue ? [queue.id] : [],
    evidence: nearby.map((f) => ({
      id: f.id,
      source: f.source.adapter,
      originalTimestamp: f.source.timestamp,
      receivedAt: f.updatedAt || runtime.clock.time,
    })),
    queueEvidence: queue
      ? {
          id: queue.id,
          source: queue.source,
          originalTimestamp: queue.timestamp,
          receivedAt: queue.updatedAt || Date.parse(queue.timestamp) || time,
        }
      : null,
    confidence: nearby.length ? 0.84 : 0.3,
    calendarEvidence: calendarEvidence(runtime.store, time, zoneId),
    estimated: true,
    modelVersion: "presence-1.0",
    calculatedAt: time,
  };
}

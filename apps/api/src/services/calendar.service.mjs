/** Configured calendar input; never infer an individual's religion or identity. */
export function activeCalendarEvents(store, timestamp, zoneId) {
  return store
    .all("calendarEvents")
    .filter(
      (event) =>
        Date.parse(event.start) <= timestamp &&
        timestamp < Date.parse(event.end) &&
        (!event.zoneIds?.length || event.zoneIds.includes(zoneId)),
    );
}
export function calendarEvidence(store, timestamp, zoneId) {
  return activeCalendarEvents(store, timestamp, zoneId).map((event) => ({
    id: event.id,
    name: event.name,
    start: event.start,
    end: event.end,
    source: "configured-calendar",
    zoneIds: event.zoneIds || [],
  }));
}

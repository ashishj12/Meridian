import { randomUUID } from "node:crypto";

/** HTTP validation and response mapping for master-data. Business decisions stay in services. */
export function createMasterDataController(context) {
  const { store, act, changed, required, validateEntity } = context;
  return {
    list: (kind) => (req, res) => res.json(store.all(kind)),
    create: (kind) =>
      act((req, res) => {
        const value = validateEntity(kind, req.body);
        value.id = value.id || randomUUID();
        if (store.get(kind, value.id)) throw new Error("ID already exists");
        store.put(kind, value);
        changed();
        res.status(201).json(value);
      }),
    update: (kind) =>
      act((req, res) => {
        const value = validateEntity(kind, {
          ...required(kind, req.params.id),
          ...req.body,
          id: req.params.id,
        });
        store.put(kind, value);
        changed();
        res.json(value);
      }),
    remove: (kind) =>
      act((req, res) => {
        required(kind, req.params.id);
        const refs = {
          calendarEvents: [["campaigns", "festivalId"]],
          zones: [
            ["screens", "zoneId"],
            ["outlets", "zoneId"],
            ["gates", "zoneId"],
            ["flights", "zoneId"],
          ],
          outlets: [["campaigns", "outletId"]],
          airlines: [["flights", "airlineId"]],
          terminals: [
            ["zones", "terminal"],
            ["screens", "terminal"],
          ],
          screens: [
            ["bookings", "screenId"],
            ["packages", "screenIds"],
            ["campaigns", "screenIds"],
          ],
          gates: [
            ["flights", "gate"],
            ["screens", "gate"],
            ["screens", "nearestGates"],
          ],
        };
        if (
          (refs[kind] || []).some(([table, key]) =>
            store
              .all(table)
              .some((v) =>
                Array.isArray(v[key])
                  ? v[key].includes(req.params.id)
                  : v[key] === req.params.id,
              ),
          )
        )
          throw new Error(
            "Record is referenced; reassign dependent records first",
          );
        store.delete(kind, req.params.id);
        if (kind === "screens") store.delete("playlists", req.params.id);
        changed();
        res.status(204).end();
      }),
  };
}

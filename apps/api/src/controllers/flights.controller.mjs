/** HTTP validation and response mapping for flights. Business decisions stay in services. */
export function createFlightsController(context) {
  const { store, act, required } = context;
  return {
    list: act((req, res) => {
      let list = store.all("flights");
      if (req.query.airlineId)
        list = list.filter((f) => f.airlineId === req.query.airlineId);
      if (req.query.q)
        list = list.filter((f) =>
          JSON.stringify([f.number, f.gate, f.destination])
            .toLowerCase()
            .includes(String(req.query.q).toLowerCase()),
        );
      res.json({
        total: list.length,
        items: list.slice(
          +(req.query.offset || 0),
          +(req.query.offset || 0) + Math.min(1000, +(req.query.limit || 100)),
        ),
      });
    }),
    read: act((req, res) => res.json(required("flights", req.params.id))),
  };
}

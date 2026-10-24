import QRCode from "qrcode";

/** HTTP validation and response mapping for promotions. Business decisions stay in services. */
export function createPromotionsController(context) {
  const { engine, act, required, publicBase } = context;
  return {
    read: act((req, res) => {
      const p = required("promos", req.params.token);
      res.json({
        ...p,
        now: engine.clock.time,
        campaign: required("campaigns", p.campaignId),
        url: `${publicBase(req)}/claim/${p.id}`,
      });
    }),
    qr: act(async (req, res) => {
      required("promos", req.params.token);
      res
        .type("svg")
        .send(
          await QRCode.toString(
            `${publicBase(req)}/claim/${req.params.token}`,
            { type: "svg", margin: 1, errorCorrectionLevel: "M" },
          ),
        );
    }),
    applyAction: (action) =>
      act((req, res) =>
        res.json(
          engine.promo(req.params.token, action, {
            issue: req.body?.issue === true,
          }),
        ),
      ),
  };
}

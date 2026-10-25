import { z } from "zod";
import { creativeProvider } from "../adapters/creative-providers.mjs";

/** HTTP validation and response mapping for creatives. Business decisions stay in services. */
export function createCreativesController(
  context,
  providerFactory = creativeProvider,
) {
  const { act, engine } = context;
  return {
    generate: act(async (req, res) => {
      const { brief, campaignId } = z
        .object({
          brief: z.string().min(5).max(1000),
          campaignId: z.string().optional(),
        })
        .parse(req.body);
      try {
        res.json(await providerFactory().generate(brief));
      } catch (error) {
        engine.event({
          type: "creative-failure",
          campaignId,
          message: error.message,
        });
        throw error;
      }
    }),
  };
}

import { z } from "zod";
import { creativeProvider } from "../adapters/creative-providers.mjs";

/** HTTP validation and response mapping for creatives. Business decisions stay in services. */
export function createCreativesController(context) {
  const { act } = context;
  return {
    generate: act(async (req, res) => {
      const { brief } = z
        .object({ brief: z.string().min(5).max(1000) })
        .parse(req.body);
      res.json(await creativeProvider().generate(brief));
    }),
  };
}

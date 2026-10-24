import { z } from "zod";
import { requestText } from "./http-client.mjs";

export class OfflineCreativeProvider {
  async generate(brief) {
    const offer = brief.match(/\d{1,2}%/)?.[0] || "15%";
    return {
      provider: "offline-template",
      category: brief.toLowerCase().includes("coffee") ? "coffee" : "sweets",
      label: "Offline template assistant · no model API call",
      headline: brief.toLowerCase().includes("coffee")
        ? "A little pause. A better journey."
        : "Something sweet for the journey.",
      headlineHi: "आपके सफर का मीठा साथी।",
      offer: `${offer} off · made for your next adventure`,
      offerHi: `${offer} की छूट · आपके अगले सफर के लिए`,
      copy: brief,
      cta: "Scan. Claim. Enjoy.",
      color: "#d8bea0",
      layout: "editorial",
      translations: { en: "A moment worth taking.", hi: "अपने लिए एक खास पल।" },
    };
  }
}
export class VendorCreativeProvider {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.AI_ENDPOINT;
    this.token = options.token || process.env.AI_API_KEY;
    this.fetchImplementation = options.fetchImplementation;
  }
  async generate(brief) {
    const response = await requestText(this.endpoint, {
      method: "POST",
      body: { brief, languages: ["en", "hi"], output: "campaign-creative" },
      token: this.token,
      fetchImplementation: this.fetchImplementation,
    });
    const creative = z
      .object({
        headline: z.string().min(1).max(160),
        headlineHi: z.string().min(1).max(200),
        offer: z.string().max(160),
        offerHi: z.string().max(200),
        category: z.string().max(30),
      })
      .parse(JSON.parse(response));
    return {
      ...creative,
      provider: "vendor-api",
      label: "External creative provider · requires review before publication",
    };
  }
}
export const creativeProvider = () =>
  process.env.AI_PROVIDER === "vendor-api"
    ? new VendorCreativeProvider()
    : new OfflineCreativeProvider();

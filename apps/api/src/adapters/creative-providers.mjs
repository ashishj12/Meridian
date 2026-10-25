import { z } from "zod";
import { requestText } from "./http-client.mjs";

const templates = {
  sweets: {
    brand: "SAFFRON",
    color: "#d8bea0",
    headlines: {
      en: "A sweeter start to your journey.",
      hi: "आपके सफर की मीठी शुरुआत।",
      ar: "بداية أحلى لرحلتك.",
      fr: "Un départ plus doux pour votre voyage.",
    },
  },
  coffee: {
    brand: "JUNIPER",
    color: "#c8b295",
    headlines: {
      en: "Take a moment, then take off.",
      hi: "एक पल ठहरें, फिर उड़ान भरें।",
      ar: "استمتع بلحظة هادئة قبل الإقلاع.",
      fr: "Prenez un instant avant de décoller.",
    },
  },
  toys: {
    brand: "LITTLE ORBIT",
    color: "#c3d6ce",
    headlines: {
      en: "Little adventures start here.",
      hi: "छोटे रोमांच यहीं से शुरू होते हैं।",
      ar: "مغامرات صغيرة تبدأ من هنا.",
      fr: "Les petites aventures commencent ici.",
    },
  },
  perfume: {
    brand: "AURELIA",
    color: "#d5c5a2",
    headlines: {
      en: "A signature scent for the journey.",
      hi: "सफर के लिए एक खास खुशबू।",
      ar: "عطر يرافق رحلتك.",
      fr: "Un parfum signature pour le voyage.",
    },
  },
  beauty: {
    brand: "AURELIA",
    color: "#d8c4c4",
    headlines: {
      en: "A brighter journey starts here.",
      hi: "एक खूबसूरत सफर की शुरुआत।",
      ar: "رحلة أكثر إشراقاً تبدأ هنا.",
      fr: "Un voyage plus lumineux commence ici.",
    },
  },
  fashion: {
    brand: "MERIDIAN EDIT",
    color: "#c7c4b8",
    headlines: {
      en: "Travel well, wherever you go.",
      hi: "जहाँ भी जाएँ, अंदाज़ से जाएँ।",
      ar: "أناقة ترافقك أينما ذهبت.",
      fr: "Voyagez avec style, où que vous alliez.",
    },
  },
  food: {
    brand: "JUNIPER",
    color: "#c6c39e",
    headlines: {
      en: "A taste worth travelling for.",
      hi: "सफर में स्वाद का खास पड़ाव।",
      ar: "نكهة تستحق أن تسافر من أجلها.",
      fr: "Une saveur qui mérite le détour.",
    },
  },
};

const languageCopy = {
  hi: {
    offer: (discount, product) => `${product} पर ${discount} की छूट`,
    body: (audience, route) =>
      `${audience} के लिए ${route} सफर की एक खास पेशकश।`,
    cta: "स्कैन करें। ऑफर पाएँ।",
  },
  ar: {
    offer: (discount, product) => `خصم ${discount} على ${product}`,
    body: (audience, route) => `عرض خاص لـ${audience} في الرحلات ${route}.`,
    cta: "امسح الرمز واستمتع بالعرض.",
  },
  fr: {
    offer: (discount, product) => `${discount} de réduction sur ${product}`,
    body: (audience, route) =>
      `Une offre spéciale pour ${audience} en voyage ${route}.`,
    cta: "Scannez et profitez de l'offre.",
  },
};

const audienceTerms = {
  en: {
    families: "families",
    business: "business travellers",
    couples: "couples",
    students: "students",
    travellers: "travellers",
  },
  hi: {
    families: "परिवारों",
    business: "व्यावसायिक यात्रियों",
    couples: "जोड़े",
    students: "छात्रों",
    travellers: "यात्रियों",
  },
  ar: {
    families: "العائلات",
    business: "المسافرين بغرض العمل",
    couples: "الأزواج",
    students: "الطلاب",
    travellers: "المسافرين",
  },
  fr: {
    families: "les familles",
    business: "les voyageurs d'affaires",
    couples: "les couples",
    students: "les étudiants",
    travellers: "les voyageurs",
  },
};

const routeTerms = {
  en: { domestic: "domestic", international: "international" },
  hi: { domestic: "घरेलू", international: "अंतरराष्ट्रीय" },
  ar: { domestic: "الداخلية", international: "الدولية" },
  fr: { domestic: "intérieur", international: "international" },
};

function parseBrief(brief) {
  const text = brief.toLowerCase();
  const category = [
    ["sweets", /\b(sweets?|mithai|chocolate|dessert|confectionery)\b/],
    ["coffee", /\b(coffee|café|cafe|tea|espresso)\b/],
    ["toys", /\b(toys?|play|kids|children)\b/],
    ["perfume", /\b(perfume|fragrance|scent|cologne)\b/],
    ["beauty", /\b(beauty|skincare|skin care|cosmetics|makeup)\b/],
    ["fashion", /\b(fashion|apparel|clothing|wear|accessories)\b/],
    ["food", /\b(food|meal|snacks?|restaurant)\b/],
  ].find(([, pattern]) => pattern.test(text))?.[0] || "food";
  const firstClause = brief.split(/[,.;\n]/, 1)[0].trim();
  const product = firstClause || templates[category].brand;
  const discount = brief.match(/\b\d{1,2}\s*%/)?.[0]?.replace(/\s+/g, "") || "15%";
  const audience = /\b(famil(?:y|ies)|children|kids)\b/.test(text)
    ? "families"
    : /\b(business|work|professional)\b/.test(text)
      ? "business"
      : /\b(couples?|romantic)\b/.test(text)
        ? "couples"
        : /\b(students?|student)\b/.test(text)
          ? "students"
          : "travellers";
  const travelType = /\binternational\b/.test(text)
    ? "international"
    : /\bdomestic\b/.test(text)
      ? "domestic"
      : "international";
  return { category, product, discount, audience, travelType };
}

export class OfflineCreativeProvider {
  constructor({ secondLanguage = process.env.CREATIVE_SECOND_LANGUAGE || "hi" } = {}) {
    this.secondLanguage = z.enum(["hi", "ar", "fr"]).parse(secondLanguage);
  }

  async generate(brief) {
    const parsed = parseBrief(brief);
    const template = templates[parsed.category];
    const language = this.secondLanguage;
    const englishAudience = audienceTerms.en[parsed.audience];
    const localizedAudience = audienceTerms[language][parsed.audience];
    const englishRoute = routeTerms.en[parsed.travelType];
    const localizedRoute = routeTerms[language][parsed.travelType];
    const headline = template.headlines.en;
    const headlineSecond = template.headlines[language];
    const offer = `${parsed.discount} off on ${parsed.product}`;
    const offerSecond = languageCopy[language].offer(
      parsed.discount,
      parsed.product,
    );
    const body = `Made for ${englishAudience} on ${englishRoute} journeys.`;
    const bodySecond = languageCopy[language].body(
      localizedAudience,
      localizedRoute,
    );
    const cta = "Scan. Claim. Enjoy.";
    const ctaSecond = languageCopy[language].cta;
    const adPage = {
      version: 1,
      format: "landscape-screen",
      templateId: `${parsed.category}-editorial-v1`,
      category: parsed.category,
      brand: template.brand,
      product: parsed.product,
      audience: parsed.audience,
      travelType: parsed.travelType,
      background: template.color,
      headline: { en: headline, [language]: headlineSecond },
      body: { en: body, [language]: bodySecond },
      offer: { en: offer, [language]: offerSecond },
      cta: { en: cta, [language]: ctaSecond },
    };
    return {
      provider: "offline-template",
      label: "Offline creative assistant · no model API call",
      ...parsed,
      secondLanguage: language,
      headline,
      headlineSecond,
      headlineHi: language === "hi" ? headlineSecond : undefined,
      offer,
      offerSecond,
      offerHi: language === "hi" ? offerSecond : undefined,
      copy: body,
      copySecond: bodySecond,
      cta,
      ctaSecond,
      color: template.color,
      layout: "editorial",
      translations: {
        en: { headline, body, offer, cta },
        [language]: {
          headline: headlineSecond,
          body: bodySecond,
          offer: offerSecond,
          cta: ctaSecond,
        },
      },
      adPage,
    };
  }
}

export class VendorCreativeProvider {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.AI_ENDPOINT;
    this.token = options.token || process.env.AI_API_KEY;
    this.secondLanguage = z
      .enum(["hi", "ar", "fr"])
      .parse(
        options.secondLanguage ||
          process.env.CREATIVE_SECOND_LANGUAGE ||
          "hi",
      );
    this.fetchImplementation = options.fetchImplementation;
  }

  async generate(brief) {
    const response = await requestText(this.endpoint, {
      method: "POST",
      body: {
        brief,
        languages: ["en", this.secondLanguage],
        secondLanguage: this.secondLanguage,
        output: "campaign-creative",
      },
      token: this.token,
      fetchImplementation: this.fetchImplementation,
    });
    const creative = z
      .object({
        headline: z.string().min(1).max(160),
        headlineSecond: z.string().min(1).max(200).optional(),
        headlineHi: z.string().min(1).max(200).optional(),
        offer: z.string().max(160),
        offerSecond: z.string().max(200).optional(),
        offerHi: z.string().max(200).optional(),
        category: z.string().max(30),
      })
      .parse(JSON.parse(response));
    const headlineSecond =
      creative.headlineSecond || creative.headlineHi;
    const offerSecond = creative.offerSecond || creative.offerHi || "";
    if (!headlineSecond)
      throw new Error(
        `Creative provider response is missing the ${this.secondLanguage} headline`,
      );
    if (!offerSecond)
      throw new Error(
        `Creative provider response is missing the ${this.secondLanguage} offer`,
      );
    return {
      ...creative,
      headlineSecond,
      headlineHi:
        this.secondLanguage === "hi"
          ? headlineSecond
          : creative.headlineHi,
      offerSecond,
      offerHi:
        this.secondLanguage === "hi" ? offerSecond : creative.offerHi,
      secondLanguage: this.secondLanguage,
      provider: "vendor-api",
      label: "External creative provider · requires review before publication",
    };
  }
}

export const creativeProvider = () =>
  process.env.AI_PROVIDER === "vendor-api"
    ? new VendorCreativeProvider()
    : new OfflineCreativeProvider();

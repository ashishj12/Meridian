import fs from "node:fs";
import {
  parseAodb,
  parseAcris,
  referenceFile,
  toAodbRow,
} from "../adapters/airport-sources.mjs";

export const DAY = "2026-10-14";
export const timeAt = (hour, minute = 0) =>
  Date.parse(
    `${DAY}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
const iso = (t) => new Date(t).toISOString();
export function profile(i, intl = false, scheduled) {
  const hour = scheduled ? new Date(scheduled).getUTCHours() : null;
  const morning = hour !== null && hour >= 5 && hour < 10;
  const evening = hour !== null && hour >= 17;
  const variation = scheduled ? ((i % 5) - 2) * 0.015 : 0;
  return {
    holiday: (intl ? 0.58 : evening ? 0.48 : 0.3) + variation,
    family: (intl ? 0.31 : evening ? 0.34 : 0.23) + variation,
    business:
      (intl ? 0.22 : morning ? 0.66 : evening ? 0.29 : 0.55) - variation,
    adult: intl ? 0.72 : 0.76,
    international: intl ? 0.57 : 0,
    couple: 0.25,
    solo: 0.34,
    group: 0.1,
    children: 0.13,
    premium: 0.15,
    frequentFlyer: 0.21,
    age: {
      "0–17": 0.18,
      "18–24": 0.14,
      "25–34": 0.26,
      "35–44": 0.2,
      "45–54": 0.13,
      "55+": 0.09,
    },
    nationalities: ["Meridian", "Solmaran", "Zarhani"],
    languages: ["English", "हिन्दी", "Solmaran"],
  };
}
export function seed(store) {
  store.clear();
  store.put("calendarEvents", {
    id: "family-festival",
    name: "Meridian family festival",
    start: "2026-10-14T15:00:00.000Z",
    end: "2026-10-14T18:00:00.000Z",
    zoneIds: ["Z7"],
    source: "configured-calendar",
  });
  const airlines = [
    "Skylark Air",
    "Aurora National",
    "Kestrel Air",
    "Coralwing Express",
    "Sunvale Airlines",
    "Solano Airways",
    "Halcyon Airways",
    "Alpine Continental",
    "Crescent Airways",
    "Lumen Pacific",
  ];
  const codes = ["XY", "ZQ", "YN", "XU", "YF", "ZO", "XH", "YG", "XI", "YU"];
  airlines.forEach((name, i) =>
    store.put("airlines", {
      id: codes[i],
      name,
      type: i < 5 ? "Domestic" : "International",
      goodwillThreshold: 30,
      partnerId: "O2",
    }),
  );
  for (let t = 1; t <= 2; t++)
    store.put("terminals", {
      id: `T${t}`,
      name: t === 1 ? "Domestic terminal" : "International terminal",
    });
  for (let i = 0; i < 10; i++) {
    const id = `Z${i + 1}`;
    store.put("zones", {
      id,
      name: [
        "North concourse",
        "East departures",
        "Central atrium",
        "South pier",
        "Domestic lounges",
        "International link",
        "Duty-free promenade",
        "West gates",
        "Premium lounges",
        "International arrivals",
      ][i],
      terminal: i < 5 ? "T1" : "T2",
      gateStart: i * 6 + 1,
    });
    store.put("queues", {
      id: `Q${i}`,
      zoneId: id,
      count: 18 + i * 3,
      timestamp: iso(timeAt(14, 10)),
      source: "project-acris-fixture",
    });
    for (let g = 1; g <= 6; g++)
      store.put("gates", {
        id: String(i * 6 + g),
        zoneId: id,
        terminal: i < 5 ? "T1" : "T2",
        name: `Gate ${i * 6 + g}`,
      });
  }
  for (const measurement of parseAcris(
    JSON.parse(
      fs.readFileSync(
        new URL("../../../../fixtures/acris/entities.json", import.meta.url),
        "utf8",
      ),
    ),
  ).filter((e) => e.type === "QueueMeasurement"))
    store.put("queues", {
      ...measurement,
      timestamp: measurement.observedAt,
      updatedAt: timeAt(14, 10),
      source: "project-acris-fixture",
    });
  const refs = parseAodb(fs.readFileSync(referenceFile, "utf8"));
  const destinations = [
    "ADN",
    "BWZ",
    "CBP",
    "CPZ",
    "DMQ",
    "BVQ",
    "KST",
    "NVQ",
    "PVQ",
    "SMG",
  ];
  const flights = refs.map((f, i) => {
    const zi = (f.terminal === "T2" ? 5 : 0) + (i % 5);
    const airlineId =
      { XD: "XY", YA: "ZQ", YB: "YU" }[f.airlineId] || f.airlineId;
    return {
      ...f,
      airlineId,
      number: airlineId + f.number.slice(2),
      zoneId: `Z${zi + 1}`,
      gate: String(zi * 6 + 1 + (i % 6)),
      profile: profile(i, f.international, f.scheduled),
      updatedAt: timeAt(14, 10),
    };
  });
  for (let i = 320; i < 898; i++) {
    const intl = i % 10 >= 5;
    const zoneNumber = 1 + (i % 10);
    const scheduled = timeAt(0) + ((i * 97 + zoneNumber * 137) % 1440) * 60000;
    flights.push({
      id: `F${i}`,
      number: codes[i % 10] + (100 + i),
      airlineId: codes[i % 10],
      direction: i % 3 === 0 ? "A" : "D",
      international: intl,
      origin: "MQI",
      destination: destinations[i % 10],
      terminal: intl ? "T2" : "T1",
      zoneId: `Z${1 + (i % 10)}`,
      gate: String((i % 10) * 6 + 1 + (i % 6)),
      scheduled: iso(scheduled),
      estimated: iso(scheduled),
      pax: 100 + ((i * 37) % 180),
      seats: 300,
      aircraft: i % 2 ? "A320" : "B38M",
      status: "Scheduled",
      delay: 0,
      profile: profile(i, intl, scheduled),
      source: {
        adapter: "seed-aodb",
        timestamp: iso(timeAt(14, 10)),
        reference: `F${i}`,
      },
      updatedAt: timeAt(14, 10),
    });
  }
  flights.push({
    id: "XY501",
    number: "XY501",
    airlineId: "XY",
    direction: "D",
    international: true,
    origin: "MQI",
    destination: "DXB",
    terminal: "T2",
    zoneId: "Z7",
    gate: "42",
    scheduled: iso(timeAt(14, 40)),
    estimated: iso(timeAt(14, 40)),
    pax: 240,
    seats: 283,
    aircraft: "A359",
    status: "Scheduled",
    delay: 0,
    profile: profile(1, true),
    source: {
      adapter: "scenario-aodb",
      reference: "XY501",
      timestamp: iso(timeAt(14, 10)),
    },
    updatedAt: timeAt(14, 10),
  });
  flights.push({
    ...flights.at(-1),
    id: "ZQ88",
    number: "ZQ88",
    airlineId: "ZQ",
    destination: "SMG",
    gate: "41",
    pax: 180,
    seats: 210,
    scheduled: iso(timeAt(15, 18)),
    estimated: iso(timeAt(15, 18)),
    source: {
      adapter: "scenario-aodb",
      reference: "ZQ88",
      timestamp: iso(timeAt(14, 10)),
    },
  });
  flights.forEach((f) => {
    if (!f.source.raw) f.source.raw = toAodbRow(f);
    store.put("flights", f);
    store.put("gateAssignments", {
      id: f.id,
      flightId: f.id,
      gateId: f.gate,
      zoneId: f.zoneId,
      terminal: f.terminal,
      assignedAt: timeAt(14, 10),
    });
    if (!store.get("aircraftTypes", f.aircraft))
      store.put("aircraftTypes", {
        id: f.aircraft,
        icao: f.aircraft,
        seats: f.seats,
      });
  });
  for (let i = 0; i < 180; i++) {
    const gate = String(1 + Math.floor(i / 3));
    store.put("screens", {
      id: `S${String(i + 1).padStart(3, "0")}`,
      name: `MQI-${i < 90 ? "T1" : "T2"}-${String(i + 1).padStart(3, "0")}`,
      zoneId: `Z${1 + Math.floor(i / 18)}`,
      terminal: i < 90 ? "T1" : "T2",
      gate,
      nearestGates: [String(Math.max(1, Number(gate) - 1)), gate],
      size: 55,
      orientation: i % 4 === 0 ? "portrait" : "landscape",
      status: i === 11 ? "offline" : i % 31 === 0 ? "degraded" : "online",
      latency: 28 + (i % 65),
      offlineSince: i === 11 ? timeAt(14) : null,
    });
  }
  const brands = [
    "Aurelia Duty Free",
    "Juniper Coffee",
    "Little Orbit Toys",
    "Altitude Lounge",
    "Saffron Table",
    "Northline Books",
    "Luma Beauty",
    "Wayfarer Goods",
  ];
  for (let i = 0; i < 40; i++) {
    const name = brands[i % 8];
    store.put("outlets", {
      id: `O${i + 1}`,
      name: i < 8 ? name : `${name} ${1 + Math.floor(i / 8)}`,
      zoneId: `Z${i < 8 ? 7 : 1 + (i % 10)}`,
      type: i % 4 === 1 ? "F&B" : "Retail",
      stock: true,
    });
  }
  brands.forEach((name, i) =>
    store.put("vendors", {
      id: `V${i + 1}`,
      name,
      contact: `hello@vendor${i}.example`,
    }),
  );
  for (let i = 0; i < 25; i++) {
    const special = i < 3;
    store.put("campaigns", {
      id: `C${i + 1}`,
      name:
        [
          "A little luxury before you fly",
          "More play. More adventure.",
          "Make room for a better journey",
        ][i] ||
        `${brands[i % 8]} · ${["Autumn departures", "A moment for you", "Gate-side favourites"][i % 3]}`,
      outletId: `O${(i % 8) + 1}`,
      category: [
        "perfume",
        "toys",
        "lounge",
        "coffee",
        "food",
        "books",
        "beauty",
        "travel",
      ][i % 8],
      headline:
        [
          "Your journey. A little more extraordinary.",
          "Big adventures. Little explorers.",
          "Your quiet above the clouds.",
        ][i] || "Good things are just around your gate.",
      offer:
        ["15% off fragrance", "Buy 2, get 1 free", "Discover the day lounge"][
          i
        ] || "20% off your next stop",
      headlineHi:
        [
          "आपकी यात्रा, कुछ और खास।",
          "छोटे यात्रियों के बड़े रोमांच।",
          "उड़ान से पहले सुकून।",
        ][i] || "आपके सफर का खास पल।",
      status: i === 24 ? "pending" : "approved",
      variantHeadlineB:
        i === 0
          ? "Bring a little luxury along."
          : i === 1
            ? "Little discoveries. Big memories."
            : "Your next favourite airport moment.",
      variantHeadlineHiB: "आपके सफर का अगला खास पल।",
      offerHi:
        i === 0
          ? "खुशबू पर 15% की छूट"
          : i === 1
            ? "दो खरीदें, एक मुफ़्त पाएँ"
            : i === 2
              ? "एक दिन का लाउंज पास"
              : "अगले पड़ाव पर 20% की छूट",
      creativeApproved: i !== 24,
      brandSafe: true,
      paused: false,
      stock: true,
      zoneIds:
        i === 2
          ? ["Z9"]
          : special
            ? ["Z7"]
            : [`Z${1 + (i % 10) === 7 ? 8 : 1 + (i % 10)}`],
      weights:
        i === 0
          ? { holiday: 0.3, international: 0.2, adult: 0.5 }
          : i === 1
            ? { family: 1 }
            : { business: 0.7, premium: 0.3 },
      affinity:
        i === 0 ? 0.71 / 0.648 : i === 1 ? 0.49 / 0.31 : i === 2 ? 0.58 : 1,
      minimumCrowd: 0,
      minimumDwell: 0,
      internationalOnly: false,
      destination: "",
      delayTrigger: i === 0 ? 30 : 0,
      budget: 20000,
      dailyCap: 2000,
      frequencyCap: 100,
      spend: 0,
      start: iso(timeAt(0)),
      end: iso(timeAt(23, 59) + 7 * 86400000),
      performance: i === 0 ? 0.7066666667 : i === 1 ? 0.78 : 0.75,
      priority: i === 0 ? 0.5 : i === 1 ? 0.36 : 0,
      color: i === 0 ? "#d8bea0" : i === 1 ? "#aacdbd" : "#b8c6df",
      createdAt: iso(timeAt(10)),
    });
  }
  for (let d = 1; d <= 30; d++)
    for (let c = 1; c <= 25; c++)
      store.put("activity", {
        id: `H${d}-${c}`,
        campaignId: `C${c}`,
        outletId: `O${((c - 1) % 8) + 1}`,
        timestamp: timeAt(0) - d * 86400000,
        plays: 300 + c * 9,
        impressions: 4500 + c * 190,
        scans: 50 + c * 4,
        claims: 30 + c * 2,
        redemptions: 20 + c,
        spend: 140 + c * 3,
        revenue: (20 + c) * 24,
        segment: c % 2 ? "family" : "holiday",
        variant: c % 2 ? "A" : "B",
        historical: true,
      });
  const perfume = store.get("campaigns", "C1");
  store.put("campaigns", {
    ...perfume,
    performance: 0.203333333333,
    priority: 0.25,
  });
  const toy = store.get("campaigns", "C2");
  store.put("campaigns", { ...toy, priority: 0.36 });
  const lounge = store.get("campaigns", "C3");
  store.put("campaigns", { ...lounge, performance: 0, priority: 0 });
  store.put("incidents", {
    id: "I1",
    title: "Screen S012 offline for more than five minutes",
    screenId: "S012",
    severity: "high",
    owner: "Network operations",
    status: "open",
    timestamp: timeAt(14, 10),
  });
  store.put("config", {
    id: "rules",
    adminAppearance: "dark",
    forecastFillRate: 0.35,
    currency: "USD",
    exploration: 0.02,
    frequencyCap: 100,
    competitorSeparation: true,
    modelVersion: "presence-1.0",
    ruleVersion: "rules-1.0",
    theme: { name: "MERIDIAN", accent: "#468cff", logo: "M" },
    language: "en",
  });
  store.put("simulation", {
    id: "clock",
    time: timeAt(14, 10),
    playing: false,
    speed: 1,
    sequence: 0,
    lastSlot: timeAt(14, 10),
    evidenceMode: "fresh",
  });
  store.put("partners", {
    id: "P1",
    name: "Juniper × Skylark · a warmer wait",
    airlineId: "XY",
    outletId: "O2",
    offer: "Meal voucher · 50/50 co-funded",
    status: "offered",
  });
}

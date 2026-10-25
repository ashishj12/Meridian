import { seed } from "../database/seed.mjs";
import { createAiScorer } from "../adapters/ai-scorers.mjs";
import { presenceService } from "./presence.service.mjs";
import { metricsService } from "./metrics.service.mjs";
import {
  candidatesService,
  decideService,
  evaluateService,
} from "./decision.service.mjs";
import {
  recordFeedService,
  emitService,
  resetService,
  controlService,
  tickService,
  refreshMockSourcesService,
  updateScheduledFlightsService,
  eventService,
} from "./simulation.service.mjs";
import { promoService } from "./promotion.service.mjs";
import {
  forecastService,
  quoteService,
  recommendationsService,
} from "./forecast.service.mjs";
import { snapshotService } from "./snapshot.service.mjs";

/** Application facade. Services below own business rules; HTTP controllers never advance time directly. */
export class AirportEngine {
  constructor(store, { aiScorer = createAiScorer() } = {}) {
    this.store = store;
    this.aiScorer = aiScorer;
    this.evaluationQueue = Promise.resolve();
    this.listeners = new Set();
    store.transaction(() => {
      store.refresh();
      if (!store.get("simulation", "clock")) seed(store);
    });
    this.clock = store.get("simulation", "clock");
    for (const name of ["AODB", "AIDX", "ACRIS"])
      if (!store.get("feeds", name))
        this.recordFeed(name, name === "AIDX" ? false : true);
    this.presences = {};
    if (!store.all("playlists").length) {
      this.updateScheduledFlights();
      this.ready = this.evaluate(false);
    } else
      for (const zone of store.all("zones"))
        this.presences[zone.id] = this.presence(zone.id);
    this.ready ||= Promise.resolve();
  }
  synchronize() {
    if (!this.store.refresh()) return false;
    this.clock = this.store.get("simulation", "clock");
    this.presences = Object.fromEntries(
      this.store.all("zones").map((zone) => [zone.id, this.presence(zone.id)]),
    );
    this.forecastCache?.clear();
    this.scheduleCache?.clear();
    this.yieldCache = null;
    for (const listener of this.listeners)
      listener({
        type: "state.synchronized",
        sequence: this.clock.sequence,
        time: this.clock.time,
      });
    return true;
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  presence(
    zoneId,
    flights = this.store.all("flights"),
    atTime = this.clock.time,
    screen,
  ) {
    return presenceService(this, zoneId, flights, atTime, screen);
  }
  metrics(outletId, airlineId) {
    return metricsService(this, outletId, airlineId);
  }
  candidates(screen, presence, campaigns) {
    return candidatesService(this, screen, presence, campaigns);
  }
  decide(screen, campaigns, deliver = false, proposalOverride) {
    return decideService(this, screen, campaigns, deliver, proposalOverride);
  }
  evaluate(deliver = true, zoneIds) {
    if (!this.aiScorer.isAsync) return evaluateService(this, deliver, zoneIds);
    const evaluation = this.evaluationQueue.then(() =>
      evaluateService(this, deliver, zoneIds),
    );
    this.evaluationQueue = evaluation.catch((error) => {
      console.error("Asynchronous AI decision evaluation failed:", error);
    });
    return evaluation;
  }
  recordFeed(name, received = true) {
    return recordFeedService(this, name, received);
  }
  emit(type, detail = {}) {
    return emitService(this, type, detail);
  }
  reset() {
    return resetService(this);
  }
  control(input) {
    return controlService(this, input);
  }
  tick(seconds = 1) {
    return tickService(this, seconds);
  }
  refreshMockSources(rewind = false) {
    return refreshMockSourcesService(this, rewind);
  }
  updateScheduledFlights() {
    return updateScheduledFlightsService(this);
  }
  event(input) {
    return eventService(this, input);
  }
  promo(token, action, options = {}) {
    return promoService(this, token, action, options);
  }
  forecast(zoneId, timestamp) {
    return forecastService(this, zoneId, timestamp);
  }
  quote(screenId, timestamp) {
    return quoteService(this, screenId, timestamp);
  }
  recommendations(campaignId = "C1") {
    return recommendationsService(this, campaignId);
  }
  snapshot() {
    return snapshotService(this);
  }
}

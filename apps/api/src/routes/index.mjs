import { registerLiveRoutes } from "./live.routes.mjs";
import { registerPlatformRoutes } from "./platform.routes.mjs";
import { registerSimulationRoutes } from "./simulation.routes.mjs";
import { registerFeedsRoutes } from "./feeds.routes.mjs";
import { registerFlightsRoutes } from "./flights.routes.mjs";
import { registerMasterDataRoutes } from "./master-data.routes.mjs";
import { registerScreensRoutes } from "./screens.routes.mjs";
import { registerCampaignsRoutes } from "./campaigns.routes.mjs";
import { registerIntelligenceRoutes } from "./intelligence.routes.mjs";
import { registerAnalyticsRoutes } from "./analytics.routes.mjs";
import { registerInventoryRoutes } from "./inventory.routes.mjs";
import { registerCreativesRoutes } from "./creatives.routes.mjs";
import { registerPromotionsRoutes } from "./promotions.routes.mjs";

export function registerApiRoutes(app, context) {
  registerLiveRoutes(app, context);
  registerPlatformRoutes(app, context);
  registerSimulationRoutes(app, context);
  registerFeedsRoutes(app, context);
  registerFlightsRoutes(app, context);
  registerMasterDataRoutes(app, context);
  registerScreensRoutes(app, context);
  registerCampaignsRoutes(app, context);
  registerIntelligenceRoutes(app, context);
  registerAnalyticsRoutes(app, context);
  registerInventoryRoutes(app, context);
  registerCreativesRoutes(app, context);
  registerPromotionsRoutes(app, context);
}

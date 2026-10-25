import { createApp } from "./app.mjs";
import { readConfiguration } from "./config/environment.mjs";
import {
  startMockAidxIngestion,
  startVendorIngestion,
} from "./services/feed-ingestion.service.mjs";
import "dotenv/config";

const configuration = readConfiguration();
const instance = createApp();
await instance.engine.ready;
const stopIngestion =
  configuration.FLIGHT_SOURCE === "vendor-api"
    ? startVendorIngestion(instance)
    : startMockAidxIngestion(instance);
const server = instance.app.listen(configuration.PORT, "0.0.0.0", () =>
  console.log("MERIDIAN API http://localhost:" + configuration.PORT),
);
let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopIngestion();
    instance.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });

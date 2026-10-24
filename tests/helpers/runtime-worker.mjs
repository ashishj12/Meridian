import { EntityRepository } from "../../apps/api/src/repositories/EntityRepository.mjs";
import { AirportEngine } from "../../apps/api/src/services/AirportEngine.mjs";
import { createRuntimeCoordinator } from "../../apps/api/src/services/runtime-coordinator.mjs";

const store = new EntityRepository(process.argv[2]);
const engine = new AirportEngine(store);
const runtime = createRuntimeCoordinator(engine, { timer: false });
process.on("message", (command) => {
  try {
    const result = runtime.execute(() =>
      command.type === "event"
        ? engine.event(command.value)
        : engine.promo(command.token, command.action),
    );
    process.send({ result });
  } catch (error) {
    process.send({ error: error.message });
  }
});
process.on("disconnect", () => {
  runtime.close();
  store.close();
  process.exit(0);
});
process.send({ ready: true });

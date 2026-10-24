import { randomUUID } from "node:crypto";

/** Coordinates processes sharing one local SQLite database. This is not a cross-host database cluster. */
export function createRuntimeCoordinator(engine, { timer = true } = {}) {
  const owner = randomUUID();
  const synchronize = () => engine.synchronize();
  const execute = (command) =>
    engine.store.transaction(() => {
      engine.synchronize();
      return command();
    });
  const tick = () =>
    execute(() => {
      if (engine.store.claimClockLease(owner)) engine.tick();
    });
  const safely = (operation) => () => {
    try {
      operation();
    } catch (error) {
      console.error("Runtime synchronization failed:", error.message);
    }
  };
  const clockTimer = timer ? setInterval(safely(tick), 1000) : null;
  const syncTimer = timer ? setInterval(safely(synchronize), 250) : null;
  return {
    owner,
    execute,
    synchronize,
    tick,
    close() {
      if (clockTimer) clearInterval(clockTimer);
      if (syncTimer) clearInterval(syncTimer);
      engine.store.releaseClockLease(owner);
    },
  };
}

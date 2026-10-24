/** HTTP validation and response mapping for live. Business decisions stay in services. */
export function createLiveController(context) {
  const { engine, clients } = context;
  return {
    subscribe: (req, res) => {
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.flushHeaders();
      clients.add(res);
      res.write(
        `event: update\ndata: ${JSON.stringify({ type: "connected", sequence: engine.clock.sequence })}\n\n`,
      );
      const keepalive = setInterval(() => res.write(": heartbeat\n\n"), 20000);
      req.on("close", () => {
        clients.delete(res);
        clearInterval(keepalive);
      });
    },
  };
}

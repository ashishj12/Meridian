import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";
import type { AirportState } from "../types/workspace";

export function useLive() {
  const [state, setState] = useState<AirportState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const fetching = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setState(await api("/state"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      fetching.current = false;
    }
  }, []);
  useEffect(() => {
    refresh();
    const source = new EventSource("/api/events");
    source.addEventListener("update", () => {
      setConnected(true);
      refresh();
    });
    source.onerror = () => setConnected(false);
    const interval = setInterval(refresh, 5000);
    return () => {
      source.close();
      clearInterval(interval);
    };
  }, [refresh]);
  return { state, connected, error, refresh };
}

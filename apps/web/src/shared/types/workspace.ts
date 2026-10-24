import type { Dispatch, SetStateAction } from "react";

/** Flexible platform-owned records. Stable feed contracts live in packages/shared-types. */
export type ApiRecord = Record<string, any>;
export interface AirportState extends ApiRecord {
  clock: ApiRecord;
  config: ApiRecord;
  screens: ApiRecord[];
  flights: ApiRecord[];
  campaigns: ApiRecord[];
  zones: ApiRecord[];
  outlets: ApiRecord[];
  airlines: ApiRecord[];
  incidents: ApiRecord[];
  partners: ApiRecord[];
  presence: Record<string, ApiRecord>;
}
/** Explicit dependencies available to a role page. Pages never create their own simulation clock. */
export interface WorkspaceContext {
  state: AirportState;
  action: (url: string, body?: any, method?: string) => Promise<any>;
  notify: (message: string) => void;
  lang: string;
  t: (key: string) => string;
  org: string;
  airline: string;
  screen: string;
  search: string;
  terminal: string;
  compact?: boolean;
  setScreen: Dispatch<SetStateAction<string>>;
  setTerminal: Dispatch<SetStateAction<string>>;
  setModal: Dispatch<SetStateAction<ApiRecord | null>>;
  setPage: Dispatch<SetStateAction<string>>;
}
export interface WorkspaceShellProps extends WorkspaceContext {
  role: string;
  page: string;
  live: {
    connected: boolean;
    error: string;
    refresh: () => Promise<void>;
  };
  split: boolean;
  setSplit: Dispatch<SetStateAction<boolean>>;
  setLang: Dispatch<SetStateAction<string>>;
  setSearch: Dispatch<SetStateAction<string>>;
  switchRole: (role: string) => void;
  setWelcome: Dispatch<SetStateAction<boolean>>;
}

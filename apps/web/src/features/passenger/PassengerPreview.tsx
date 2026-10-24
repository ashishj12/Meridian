import PassengerDisplay from "./PassengerDisplay";
import { api } from "../../shared/api/client";
import type { WorkspaceContext } from "../../shared/types/workspace";

export function Passenger(context: WorkspaceContext) {
  return <PassengerDisplay {...context} api={api} />;
}

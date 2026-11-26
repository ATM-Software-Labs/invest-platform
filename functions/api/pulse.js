import { handlePulse } from "../../shared/market.js";

export function onRequest(context) {
  return handlePulse(context.request);
}

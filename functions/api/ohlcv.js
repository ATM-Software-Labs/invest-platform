import { handleOhlcv } from "../../shared/market.js";

export function onRequest(context) {
  return handleOhlcv(context.request);
}

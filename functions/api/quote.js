import { handleQuote } from "../../shared/public-quote.js";

export function onRequest(context) {
  return handleQuote(context.request);
}

import { handleSearch } from "../../shared/public-quote.js";

export function onRequest(context) {
  return handleSearch(context.request);
}

import { deny } from "../shared/guard.js";

export async function onRequest(context) {
  const blocked = deny(context.request);
  if (blocked) return blocked;
  return context.next();
}

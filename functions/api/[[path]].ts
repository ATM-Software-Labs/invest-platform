import { handleApi, type EdgeEnv } from "../../src/edge/handler";

export async function onRequest(context: { request: Request; env: EdgeEnv }): Promise<Response> {
  return handleApi(context.request, context.env);
}

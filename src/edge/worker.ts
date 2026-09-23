import { handleInvestFetch, type EdgeEnv } from "./handler.js";

export default {
  async fetch(request: Request, env: EdgeEnv): Promise<Response> {
    return handleInvestFetch(request, env);
  },
};

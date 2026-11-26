import { deny } from "../shared/guard.js";
import { handleOhlcv, handlePulse } from "../shared/market.js";

globalThis.__hubMarket = { deny, handleOhlcv, handlePulse };

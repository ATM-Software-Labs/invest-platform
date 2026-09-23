# invest-platform

Backend institucional de `subdomain.yourdomain.com`.

Recibe cualquier identificador global (acciones, cripto, bonos soberanos, FX y materias primas), consulta EODHD / Financial Modeling Prep / OpenBB, normaliza estados financieros entre IFRS y US GAAP, y entrega un payload único tipado para el motor cuantitativo.

## Contrato

```
GET /api/v1/asset/:identifier
GET /api/v1/asset?identifier=EUR/USD
GET /api/v1/resolve/:identifier
GET /api/v1/score/:identifier
GET /api/v1/analysis/:identifier
POST /api/v1/analysis/:identifier
GET /health
```

`UnifiedAssetPayload` está discriminado por `assetClass`: `equity` | `crypto` | `bond` | `forex`.

## Resolución

| Entrada | Clase | Notas |
|---|---|---|
| `MSFT`, `BRK.B`, `NVDA` | equity US | NYSE/NASDAQ |
| `IDR.MC`, `RHM.DE`, `RR.L` | equity EU | LSE en GBX → GBP / 100 |
| `7203.T`, `9988.HK`, `2330.TW` | equity Asia | ADR USD enlazado cuando existe |
| `BTC`, `ETH`, `SOL` | crypto | vs USD/EUR |
| `US10Y`, `US02Y`, `BUND10Y`, `BONO10Y` | bond | TIR, spread vs UST 10Y, duración |
| `EUR/USD`, `XAU/USD`, `PPFB.DE` | forex / ETP | ETP de oro listado como equity `physical_etp` |

## Normalización contable

- **FCF real** = Operating Cash Flow − Capex. Si el estándar es IFRS 16, se restan también los lease payments (el OCF IFRS no es comparable al US GAAP).
- **Ratios adimensionales** (ROIC, ROE, márgenes, Net Debt/EBITDA) se calculan siempre en la moneda de reporte. No hay conversión FX previa.
- **Dilución neta** a 1/3/5 años sobre diluted shares, más SBC / FCF.
- **Deuda financiera neta** = deuda financiera (leases segregados) − caja − inversiones a corto.

Si faltan trimestres, el servicio construye TTM con cuatro trimestres consecutivos o cae al último anual completo y lo declara en `dataQuality.fallbacksUsed`.

## Arranque

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Sin claves de vendor el servicio responde con fixtures deterministas de los identificadores del spec (`ENABLE_DEMO_FIXTURES=true`). En producción configura al menos `EODHD_API_TOKEN` o `FMP_API_KEY`. Redis es opcional; si `REDIS_URL` no está definido se usa LRU en proceso.

```bash
docker compose up --build
```

Cadena de vendors: **EODHD → FMP → OpenBB → fixtures**. Los parciales se fusionan. Caché: 12 h fundamentales, 60 s cotizaciones de renta variable vía TTL de clase de activo (cripto 120 s, macro 300 s).

## Scoring determinista + LLM cualitativo

El LLM **no calcula**. `InvestorScoringEngine` produce afinidad 0–100 para Buffett, Burry, Dalio y tesis monetaria dura, más bandas de fair value a múltiplos de FCF 12× / 18× / 25×. El orquestador envía solo esos hechos a Grok (`XAI_API_KEY`, modelo `grok-4.6`) con JSON Schema estricto y fusiona la narrativa con los números del motor.

```bash
curl http://127.0.0.1:8787/api/v1/score/MSFT
curl http://127.0.0.1:8787/api/v1/analysis/MSFT?qualitative=false
curl -X POST http://127.0.0.1:8787/api/v1/analysis/TEST \
  -H "Content-Type: application/json" \
  -d '{"qualitative":false,"enrichment":{"priceToTangibleBook":0.9,"shortInterestPercent":0.12,"visibleDeleveragingCatalyst":true}}'
```

## Terminal (Next.js 19 / React 19)

```bash
cd web
npm install
npm run dev
```

UI en `http://127.0.0.1:3000`. El backend debe estar en `:8787`. Atajo `Cmd+K` / `Ctrl+K` para el buscador global. Vista principal: `web/components/InvestAssetView.tsx`.

Producción (Cloudflare Worker + assets, ruta de zona sobre el DNS comodín):

```bash
npm run deploy
```

Host: [subdomain.yourdomain.com](https://subdomain.yourdomain.com)



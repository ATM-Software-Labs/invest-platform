# INVEST public worker

Source of the static Cloudflare Worker that serves the public INVEST site: pre-rendered pages
(`/`, `/munger/`, `/modelos/`, `/glosario/`, `/comparar/`, `/suscribirse/`, `/perfil/`, essay and legal pages),
`/api/quote`, the newsletter subscription API and `sitemap.xml` / `robots.txt`.

## Layout

| Path | What |
| --- | --- |
| `src/build.mjs` | Build script: renders the pages, compiles Tailwind 3, minifies inline JS with esbuild and assembles `dist/worker.js`. |
| `src/chrome-snippet.mjs`, `src/content.mjs`, `src/*.html` | Page chrome (head, header, footer, theme/i18n) and page content. |
| `src/*-app.js`, `src/*-shared.js` | Client scripts inlined into the pages. |
| `src/worker-quote.js`, `src/worker-sub.js` | Worker code: quotes API, subscription (Turnstile + honeypot + rate limit, Brevo double opt-in) and routing. |
| `src/icon.png`, `src/input.css` | Favicon (inlined as base64) and Tailwind entry file. |
| `src/test-worker-mocks.mjs` | Smoke test of `dist/worker.js` with mocked KV, Turnstile and Brevo. |
| `src/verify-playwright.mjs` | Optional visual check against a running worker (`node src/verify-playwright.mjs <base-url> [out-dir]`, needs `playwright`). |

Compiled output (`dist/`, and the old `worker.js` / `invest-worker-search.js` / `index-search.html` bundles) is never committed.

## Build

```bash
cd web/public-worker
npm ci
cp build.local.env.example build.local.env   # set TURNSTILE_SITEKEY (public site key)
npm run build                                # -> dist/worker.js (ASCII-only ES module)
npm test                                     # optional smoke test
```

`TURNSTILE_SITEKEY` can also be passed as an environment variable. Shared blocks (style, theme/i18n script,
header, footer, large inline scripts) are stored once in `BLOCKS` and injected per request (`<!--Bn-->` markers);
`aria-current` for the sub-nav is added at request time.

## Deploy

```bash
cp wrangler.example.toml wrangler.toml       # gitignored: fill in the placeholders
npx wrangler secret put BREVO_API_KEY -c wrangler.toml
npx wrangler secret put TURNSTILE_SECRET -c wrangler.toml
npx wrangler deploy -c wrangler.toml
```

## Configuration

| Name | Kind | Purpose |
| --- | --- | --- |
| `SUBSCRIBERS` | KV binding (`<KV_NAMESPACE_ID>`) | Rate-limit counters (hashed IP, 1 h TTL), per-address cooldown (hashed email, 15 min TTL), cached Brevo folder/list/template ids. |
| `BREVO_API_KEY` | secret | **Required** to enable the form. Without it `/api/subscribe/status` reports `enabled:false` and the UI shows "Suscripcion disponible pronto". |
| `TURNSTILE_SECRET` | secret | Server-side Turnstile verification (action `subscribe`). |
| `TURNSTILE_SITEKEY` | build-time | Public Turnstile site key, baked into the bundle and returned by `/api/subscribe/status`. |
| `BREVO_LIST_MARKETS` | var | Brevo list id for "Markets Digest" (`<BREVO_LIST_MARKETS_ID>`). If unset, the list is found or created by name. |
| `BREVO_LIST_INVEST` | var | Brevo list id for "INVEST Notas" (`<BREVO_LIST_INVEST_ID>`). If unset, found or created by name. |
| `DOI_REPLY_TO` | var | Reply-To address of the double opt-in template, used only when the worker creates that template. If unset, no Reply-To is set. |
| `BREVO_DOI_TEMPLATE_ID` | var, optional | Pins the DOI template; otherwise the worker finds or creates "INVEST - Confirmacion doble opt-in" (tag `optin`, `{{ doubleoptin }}`) and caches its id in KV (`cfg:brevo:doi`). |
| `SUB_TEST_TOKEN` + `SUB_TEST_EMAIL` | secret + var, temporary | End-to-end test hook: a request with header `x-invest-test: <token>` for exactly `SUB_TEST_EMAIL` skips Turnstile. Inert unless both exist; delete both right after the test. |

Endpoints: `POST /api/subscribe` (alias `/api/newsletter`), `GET /api/subscribe/status`, `/confirmado/` (DOI redirect),
`GET /api/quote`, `/assets/app.css`, `/favicon.png`, `/sitemap.xml`, `/robots.txt`.

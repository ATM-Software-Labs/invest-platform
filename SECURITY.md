# Política de seguridad / Security policy

## Cómo informar de una vulnerabilidad

Escribe a **security@trujillomingorance.com** con una descripción, los pasos para reproducirla y el impacto
estimado. **No abras un issue público** para vulnerabilidades. Responderemos en un plazo razonable (objetivo:
5 días laborables) y te mantendremos informado hasta la corrección.

Por favor, no accedas a datos de terceros, no degrades el servicio y no hagas pruebas de carga o de spam contra
el formulario de suscripción.

## Alcance

- Web pública `https://invest.trujillomingorance.com` (Cloudflare Worker de `web/public-worker/`).
- Backend y terminal de este repositorio (`src/`, `web/`, `functions/`).

Fuera de alcance: servicios de terceros (Yahoo Finance, SEC EDGAR, Brevo, Cloudflare) y hallazgos sin impacto
demostrable (cabeceras informativas, SPF/DMARC, etc.).

## English

Please report vulnerabilities privately to **security@trujillomingorance.com** (do not open a public issue).
Include steps to reproduce and the expected impact. We aim to reply within 5 business days.

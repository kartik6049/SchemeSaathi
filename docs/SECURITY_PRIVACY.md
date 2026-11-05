# Security & privacy

## Privacy (NFR-07, NFR-08, DPDP Act 2023 principles)
- **No identifiers collected**: no name, phone, Aadhaar or any ID. Unknown keys sent to `/api/match` are dropped by validation.
- **No profile storage**: `/api/match` is stateless (verified by test IT-PRIV-01).
  Responses carry `Cache-Control: no-store`.
- **Answers stay on the device** (`localStorage`) for convenience. "Start over" deletes them.
- **Results links contain answers**: disclosed on the privacy page.
- **Analytics are anonymous**: event type, optional scheme slug and step only. No IP, UA or cookie.
- **Logs** record method, path, status and duration only. Bodies and query strings are never logged.
- **Fonts self-hosted**, no third-party scripts or CDNs, so no third party learns who visits.

## Security (NFR-05, NFR-06)
| Threat | Mitigation |
|---|---|
| Admin brute force | bcrypt cost 12; login rate limit 10 / 15 min / IP; generic error message; timing-equalised unknown-user path |
| Session theft (XSS) | JWT in an **httpOnly** cookie that page scripts can't read; React escapes output; no `dangerouslySetInnerHTML` |
| CSRF | `SameSite=Strict` cookie scoped to `/api`; JSON-only API |
| Injection | Parameterised SQL everywhere; search input reduced to letter/digit tokens before `to_tsquery` |
| Bad input | zod validation on every body/query; 100 kB body limit; rule semantics validated |
| Info leakage | Generic 500s, no stack traces; `x-powered-by` disabled; helmet security headers |
| Abuse / DoS | 300 req/min/IP on the API (configurable) |
| Mass assignment | Explicit zod schemas, so unknown fields are stripped |
| Secrets | `.env` git-ignored; `JWT_SECRET` ≥ 32 chars enforced at boot; Docker ports bound to 127.0.0.1 |
| Phishing look-alike | Footer and detail pages state it's not a government site; official links use `rel="noopener noreferrer"` |

## Before going to production
- Serve over HTTPS only (TLS 1.2+). `COOKIE_SECURE` defaults to true in production.
- Rotate `JWT_SECRET` and the admin password; don't use the defaults.
- Put the API behind a reverse proxy and confirm `trust proxy` matches your topology.
- Run `npm audit` in `server/` and `client/`, and a Lighthouse/axe accessibility pass.

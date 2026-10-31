# Security policy

LankaTwin is a static site and a static, read-only API on GitHub Pages: there are no servers,
accounts, keys or stored personal data. Problems can still matter, for example a way to run
script on the site, to make it show false warnings, or to tamper with the build.

## Reporting a vulnerability

Please report privately through GitHub:
**[Report a vulnerability](https://github.com/LankaTwin/LankaTwin.github.io/security/advisories/new)**.
Don't open a public issue for security problems.

Include what you found, how to reproduce it and what an attacker could do with it. You'll get a
first answer within 7 days. Fixes ship as soon as they're ready, and you're credited in the
advisory unless you'd rather not be. English, Sinhala and Tamil are all fine.

The machine-readable contact is at
[/.well-known/security.txt](https://lankatwin.github.io/.well-known/security.txt).

## Scope

In scope: the site at lankatwin.github.io, the API under `/api/v1/`, the embeddable widgets, and
this repository's build and deploy workflows.

Out of scope: the upstream data services (Open-Meteo, Copernicus, NASA, the Irrigation
Department's ArcGIS services, CARTO, Wikimedia, Cloudinary); report those to their owners. Also
out of scope: GitHub Pages' own headers and TLS, denial of service, and the accuracy of model
data (please open a normal issue for wrong data).

## How the project is protected

- **Content Security Policy** on every page: scripts only from the site itself plus hashed
  inline scripts, network requests only to the listed data sources, no plugins, no `<base>`
  hijacking, no form posts elsewhere (`scripts/csp.ts`; a test fails if the code calls a host the
  policy doesn't allow).
- **No raw HTML from data**: upstream text is rendered as text. The API strips control characters
  and angle brackets from upstream text, and CSV cells that a spreadsheet would run as formulas
  are defused.
- **Defensive clients**: HTTPS only, no cookies sent to data sources, timeouts on every request,
  answers must be JSON objects, and saved settings are validated when read back.
- **Supply chain**: GitHub Actions pinned to commit SHAs with least-privilege permissions,
  `npm ci --ignore-scripts`, `npm audit` and registry signature checks, dependency review on pull
  requests, CodeQL code scanning, and Dependabot for npm and Actions updates.

## Limits of a static host

GitHub Pages can't send custom response headers, so the policy is a `<meta>` tag, which can't
set `frame-ancestors`. The site has no logged-in state or actions that framing could abuse, and
the town widgets are meant to be embedded. HTTPS with HSTS comes from github.io itself.

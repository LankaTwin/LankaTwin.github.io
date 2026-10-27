# Contributing to LankaTwin

Thanks for helping. The most valuable contributions right now:

1. **National data connectors** — Irrigation Department gauge levels, Department of Meteorology observations, DMC/NBRO warnings. See `docs/DATA_CONNECTORS.md`.
2. **Validation** — compare a model value in LankaTwin with a gauge or bulletin and open an issue with both numbers and the source.
3. **Translation** — Sinhala and Tamil interface strings.

## Local setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then writes dist/
npm run preview    # serve the production build
```

Node 20+ is required (CI uses 22).

## Ground rules

- Everything must run in the browser on static hosting. No server, no API keys in the client.
- Every new source gets an entry in `src/lib/sources.ts` with licence and attribution.
- Label modelled data as modelled. Never present a screening signal as an official warning.
- Keep the UI usable on a mid-range Android phone over 4G.

## Pull requests

Small, focused PRs please. Describe what changed and how you checked it (screenshots for UI changes).

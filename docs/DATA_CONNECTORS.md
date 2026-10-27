# Adding a data connector

## Sources a browser can call directly

If the endpoint returns `Access-Control-Allow-Origin: *` (check with `curl -I -H "Origin: https://example.com" <url>`):

1. Add a fetch function to `src/lib/api.ts` using `fetchJson(sourceName, url, signal)`. It handles timeouts and turns failures
   into a `SourceError` the UI already knows how to show.
2. Wrap it in a `useQuery` hook (see `src/hooks/useLiveData.ts`) with a sensible `refetchInterval`.
3. Add an entry to `src/lib/sources.ts` with licence and attribution.
4. If it should raise signals, add a rule in `src/lib/alerts.ts` and document the threshold on the Signals page.

## Sources a browser cannot call (most Sri Lankan government sites)

The Department of Meteorology, Irrigation Department and DMC publish data as web pages, PDFs or dashboards without CORS headers.
A static site cannot read those directly. The zero-cost pattern is a **scheduled snapshot**:

```
GitHub Actions (cron, e.g. every 30 min)
  └─ scripts/snapshot-<source>.mjs   fetch + parse server-side, polite rate
       └─ writes public/data/<source>.json  ({ fetchedAt, source, items: [...] })
            └─ commits to a `data` branch, Pages serves it at ./data/<source>.json
                 └─ app fetches it like any other source, showing fetchedAt as freshness
```

Ground rules for snapshots:

- Ask the publisher first where possible, and respect `robots.txt` and their terms.
- Fetch at most every 30 minutes, with an identifying User-Agent that links to this repo.
- Keep the raw value, the unit, the station name as published, and the publisher's timestamp.
- Never invent missing values; mark them `null`.
- If parsing fails, keep the previous snapshot and record the error so the UI can say the source is stale.

A sample workflow skeleton:

```yaml
name: Snapshot national data
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch:
permissions: { contents: write }
jobs:
  snapshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: data }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node scripts/snapshot-irrigation.mjs > data/irrigation.json.tmp && mv data/irrigation.json.tmp data/irrigation.json
      - run: |
          git config user.name "lankatwin-bot"
          git config user.email "lankatwin-bot@users.noreply.github.com"
          git add data && git commit -m "snapshot $(date -u +%FT%TZ)" || echo "no change"
          git push
```

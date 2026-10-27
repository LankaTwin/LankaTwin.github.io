# Translations

LankaTwin's interface is available in English, Sinhala (සිංහල) and Tamil (தமிழ்). Visitors pick a language from the
menu in the header; the first visit follows the browser's language.

The Sinhala and Tamil text was drafted with AI help and **needs review by native speakers**. Corrections are the most
valuable contribution you can make — no coding knowledge needed beyond editing a text file.

## Where the text lives

| File | Language |
|---|---|
| `src/i18n/en.ts` | English, the source of every key |
| `src/i18n/si.ts` | Sinhala |
| `src/i18n/ta.ts` | Tamil (Sri Lankan usage: திணைக்களம், அனர்த்த முகாமைத்துவ நிலையம், பருவக்காற்று) |
| `src/lib/places.ts` | Town, river and river-point names (`si`, `ta` fields) |
| `src/lib/time.ts` | Built-in month and weekday names, used when a browser has no Sinhala or Tamil date data |

Each line is `'key': 'text'`. Change only the text on the right.

## Rules

- Keep every `{placeholder}` exactly as it is, in whatever position reads naturally. `{place}`, `{n}`, `{mm}` and so on
  are filled in by the app; some, like `{dom}` or `{link}`, become links.
- Keep units and codes as they are: `°C`, `mm`, `km/h`, `m³/s`, `US AQI`, `PM2.5`.
- Prefer the terms the Department of Meteorology and the Disaster Management Centre use in their own Sinhala and Tamil bulletins.
- Numbers stay in Western digits, as on official Sri Lankan forecasts.

`npm test` checks that every key exists in all three languages, that placeholders match, and that Sinhala and Tamil
strings are written in their own script. Run it before opening a pull request, or let CI run it for you.

## Adding a string

1. Add the key and English text to `src/i18n/en.ts`.
2. Add the same key to `si.ts` and `ta.ts`. TypeScript refuses to build until both have it.
3. In a component, `const { t } = useT()` and then `t('your.key', { name })`. For text with links inside, use
   `rich(t('your.key'), { link: <a …>…</a> })`.

import { Link } from 'react-router-dom'
import { useSettings } from '../stores/settings'

const ROADMAP: { phase: string; items: [string, boolean][] }[] = [
  { phase: 'Now', items: [
    ['Live map of 26 towns: temperature, feels-like, rain, humidity, gusts, air quality', true],
    ['River discharge at 14 points with rise detection', true],
    ['Satellite overlays: true colour, NDVI, IMERG rain rate, land surface temperature', true],
    ['Station pages with 24 h / 7 d / 30 d charts, 7-day forecast, rainfall anomaly and solar resource', true],
    ['Compare places; CSV and PNG export; offline-capable install (PWA)', true],
  ] },
  { phase: 'Next', items: [
    ['Irrigation Department gauge levels and Met Department observations via scheduled snapshots', false],
    ['Basin pages that tie rain upstream to river response', false],
    ['Landslide-prone districts layer from NBRO, with DMC warnings', false],
    ['Sinhala and Tamil interface', false],
  ] },
  { phase: 'Later', items: [
    ['Historical playback slider for past events (e.g. the May 2024 floods)', false],
    ['Agriculture stress and reservoir storage indicators', false],
    ['Embeddable widgets for news sites and local councils', false],
  ] },
]

export default function AboutPage() {
  const { refreshMinutes, setRefresh } = useSettings()
  return (
    <div className="prose-lt mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-3 text-3xl font-extrabold tracking-tight">About LankaTwin</h1>
      <p className="text-lg">
        LankaTwin is a free, open-source window onto Sri Lanka’s weather, rivers, air and land — a first, public layer of a digital twin
        of the island. It runs entirely in your browser, on GitHub Pages, and costs nothing to use or host.
      </p>

      <h2>How the numbers are made</h2>
      <p>
        Each town on the map is a grid cell in a global model. Weather comes from Open-Meteo’s blend of national weather-service models;
        air quality from the Copernicus Atmosphere Monitoring Service; river flow from the Copernicus Global Flood Awareness System (GloFAS);
        the rainfall baseline from the ERA5 reanalysis; solar energy from NASA POWER; and satellite imagery from NASA’s GIBS.
      </p>
      <ul>
        <li><b>Rain, last 24 h</b> sums the model’s hourly analysis. It can miss a localised downpour that a rain gauge would catch.</li>
        <li><b>River rise</b> divides the highest forecast discharge over the next 10 days by the median of the past 30 days. GloFAS works on a 5 km grid, so absolute values for small rivers can be off; the trend is more useful than the number.</li>
        <li><b>Rain against the past decade</b> compares the latest 30 complete days with the same dates in each of the previous ten years.</li>
        <li><b>Signals</b> are screening thresholds you can read on the <Link to="/alerts">Signals page</Link>. They are not official warnings.</li>
      </ul>

      <h2>What it is not</h2>
      <p>
        LankaTwin is unofficial and does not replace the Department of Meteorology, the Irrigation Department, NBRO or the Disaster Management Centre.
        In an emergency, follow their instructions and call <b>117</b>.
      </p>

      <h2>Roadmap</h2>
      {ROADMAP.map((r) => (
        <div key={r.phase}>
          <h3>{r.phase}</h3>
          <ul className="!list-none !pl-0">
            {r.items.map(([t, done]) => (
              <li key={t} className="flex gap-2"><span aria-label={done ? 'Done' : 'Not started'} className={done ? 'text-paddy' : 'text-muted'}>{done ? '✓' : '○'}</span>{t}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Settings</h2>
      <p>
        <label className="flex items-center gap-3">
          Refresh live data every
          <select value={refreshMinutes} onChange={(e) => setRefresh(+e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1">
            {[5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n} minutes</option>)}
          </select>
        </label>
      </p>

      <h2>Contribute</h2>
      <p>
        The code is MIT-licensed on <a href="https://github.com/AshenWijesingha/LankaTwin">GitHub</a>. Developers, hydrologists, meteorologists
        and students are welcome — especially to add national data connectors, check model values against local gauges, or translate the interface.
      </p>
    </div>
  )
}

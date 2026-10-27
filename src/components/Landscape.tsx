import type { Zone } from '../lib/places'

// Flat illustrations of the island's three broad landscapes. They stand in for a
// place photo when none loads (offline, or the photo source is unreachable) and
// head the About page. Sky and light follow the weather and time of day.

export type Sky = 'day' | 'rain' | 'night'

const SKY: Record<Sky, [string, string]> = {
  day: ['#9ed3e4', '#e8f4f1'],
  rain: ['#8d9ea6', '#c9d3d4'],
  night: ['#10273a', '#2c4a5c'],
}

function Palm({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 C 6 -40, 14 -80, 30 -118" stroke="#5b4630" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[[-46, -8], [-30, -34], [8, -40], [34, -22], [44, 4]].map(([dx, dy], i) => (
        <path key={i} d={`M30 -118 q ${dx / 2} ${dy - 18} ${dx} ${dy + 10}`} stroke="#2f6b3a" strokeWidth="7" fill="none" strokeLinecap="round" />
      ))}
    </g>
  )
}

function Rain() {
  return (
    <g stroke="#ffffff" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round">
      {Array.from({ length: 60 }, (_, i) => {
        const x = (i * 137) % 820
        const y = (i * 53) % 220
        return <line key={i} x1={x} y1={y} x2={x - 8} y2={y + 22} />
      })}
    </g>
  )
}

function Celestial({ sky }: { sky: Sky }) {
  if (sky === 'rain') return null
  if (sky === 'night') {
    return (
      <g>
        <circle cx="560" cy="74" r="24" fill="#efe3b8" />
        <circle cx="571" cy="66" r="22" fill={SKY.night[0]} />
        {[[90, 40], [210, 80], [330, 30], [470, 60], [560, 110], [720, 40], [760, 120]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.8" fill="#fff" opacity=".8" />)}
      </g>
    )
  }
  return <circle cx="560" cy="80" r="30" fill="#f6c453" />
}

function Coast() {
  return (
    <g>
      <path d="M0 170 H800 V300 H0z" fill="#1f8a96" />
      <path d="M0 176 q 100 -10 200 0 t 200 0 t 200 0 t 200 0" stroke="#7fcbd1" strokeWidth="3" fill="none" opacity=".7" />
      <path d="M0 198 q 100 -8 200 0 t 200 0 t 200 0 t 200 0" stroke="#7fcbd1" strokeWidth="2" fill="none" opacity=".5" />
      <path d="M0 236 C 180 214, 420 222, 800 206 V300 H0z" fill="#ecd9a8" />
      <path d="M0 236 C 180 214, 420 222, 800 206" stroke="#ffffff" strokeWidth="3" fill="none" opacity=".75" />
      {/* Oruwa outrigger canoe */}
      <g transform="translate(400 176)">
        <path d="M0 0 h70 l-8 8 h-54z" fill="#6b4a2c" />
        <path d="M34 0 v-34 l22 30z" fill="#f3efe2" />
        <path d="M8 10 h56" stroke="#6b4a2c" strokeWidth="2" />
      </g>
      <Palm x={190} y={262} s={1} />
      <Palm x={250} y={270} s={0.8} flip />
      <Palm x={640} y={252} s={0.9} flip />
    </g>
  )
}

function Hills() {
  return (
    <g>
      <path d="M0 150 C 120 70, 220 90, 320 130 S 520 60, 640 100 S 760 120, 800 110 V300 H0z" fill="#6f9b8a" opacity=".8" />
      <path d="M0 190 C 140 120, 260 150, 380 170 S 600 110, 800 160 V300 H0z" fill="#3f7d4d" />
      <g stroke="#2f6a3c" strokeWidth="3" fill="none" opacity=".8">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${-20 + i * 6} ${200 + i * 14} C 180 ${150 + i * 14}, 420 ${190 + i * 12}, 820 ${170 + i * 13}`} />)}
      </g>
      <path d="M0 250 C 200 222, 480 260, 800 236 V300 H0z" fill="#2c6338" />
      {/* Mist bands */}
      <path d="M0 140 C 200 128, 420 150, 800 132" stroke="#ffffff" strokeWidth="14" fill="none" opacity=".35" strokeLinecap="round" />
      {/* Tea pickers' path and a small estate bungalow */}
      <g transform="translate(470 196)">
        <path d="M0 0 h44 v24 h-44z" fill="#f1ece0" />
        <path d="M-6 2 l28 -18 l28 18z" fill="#b8452f" />
        <rect x="18" y="10" width="9" height="14" fill="#6b4a2c" />
      </g>
    </g>
  )
}

function Plains() {
  return (
    <g>
      <path d="M0 175 C 200 165, 600 180, 800 168 V300 H0z" fill="#9cbf5a" />
      {/* Tank (reservoir) */}
      <path d="M390 198 C 450 186, 600 188, 700 198 C 640 214, 460 214, 390 198z" fill="#4aa0b5" />
      <path d="M430 199 h70 M540 201 h100" stroke="#bfe3ea" strokeWidth="2" opacity=".8" />
      {/* Dagoba (stupa) */}
      <g transform="translate(300 176)">
        <rect x="-44" y="-6" width="88" height="10" fill="#e6dcc8" />
        <path d="M-36 -6 A36 36 0 0 1 36 -6z" fill="#f4efe3" />
        <rect x="-8" y="-52" width="16" height="12" fill="#e6dcc8" />
        <path d="M-4 -52 L0 -84 L4 -52z" fill="#d9b44a" />
      </g>
      {/* Paddy rows */}
      <g stroke="#6f9a34" strokeWidth="3" opacity=".9">
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${232 + i * 15} C 260 ${222 + i * 15}, 540 ${236 + i * 15}, 800 ${226 + i * 15}`} fill="none" />)}
      </g>
      <path d="M0 220 C 240 210, 520 226, 800 214" stroke="#d8cf86" strokeWidth="4" fill="none" />
      <Palm x={590} y={190} s={0.6} />
      <Palm x={200} y={196} s={0.7} flip />
    </g>
  )
}

export default function Landscape({ zone, sky = 'day', className = '', label }: { zone: Zone; sky?: Sky; className?: string; label?: string }) {
  const [top, bottom] = SKY[sky]
  const id = `lt-sky-${zone}-${sky}`
  return (
    <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" className={className} role={label ? 'img' : undefined} aria-hidden={label ? undefined : true} aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill={`url(#${id})`} />
      <Celestial sky={sky} />
      {zone === 'coast' && <Coast />}
      {zone === 'hills' && <Hills />}
      {zone === 'plains' && <Plains />}
      {sky === 'night' && <rect width="800" height="300" fill="#0b1c28" opacity=".45" />}
      {sky === 'rain' && <Rain />}
    </svg>
  )
}

/** Pick a sky from the current weather code and day/night flag. */
export function skyFor(code: number | null | undefined, isDay: boolean | null | undefined): Sky {
  if (code != null && code >= 51) return 'rain'
  if (isDay === false) return 'night'
  return 'day'
}

// Weather pictograms for WMO weather codes. Drawn inline so they work offline and
// keep the same colours in light and dark themes.

type Kind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavy' | 'thunder'

export function iconKind(code: number | null | undefined): Kind {
  if (code == null) return 'cloudy'
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code === 65 || code === 67 || code === 82) return 'heavy'
  if (code >= 95) return 'thunder'
  return 'rain'
}

const SUN = '#F2A81D'
const MOON = '#E9D9A6'
const CLOUD = '#C9D6DA'
const CLOUD_DARK = '#8FA3AA'
const DROP = '#3A8FD0'
const BOLT = '#F5C518'

function Sun({ x = 32, y = 32, r = 11 }) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return <line key={i} x1={x + Math.cos(a) * (r + 4)} y1={y + Math.sin(a) * (r + 4)} x2={x + Math.cos(a) * (r + 9)} y2={y + Math.sin(a) * (r + 9)} stroke={SUN} strokeWidth="3.5" strokeLinecap="round" />
  })
  return <g>{rays}<circle cx={x} cy={y} r={r} fill={SUN} /></g>
}

function Moon({ x = 30, y = 30, r = 13 }) {
  return <path d={`M${x + r * 0.35} ${y - r} a${r} ${r} 0 1 0 ${r * 0.75} ${r * 1.55} a${r * 0.95} ${r * 0.95} 0 0 1 -${r * 0.75} -${r * 1.55}z`} fill={MOON} />
}

function Cloud({ dx = 0, dy = 0, fill = CLOUD }) {
  return <path transform={`translate(${dx} ${dy})`} d="M18 50h30a10 10 0 0 0 1-19.9A14 14 0 0 0 22 28a11 11 0 0 0-4 22z" fill={fill} />
}

function Drops({ n = 3, color = DROP, len = 7 }) {
  const xs = n === 2 ? [26, 38] : n === 3 ? [22, 32, 42] : [19, 27, 35, 43]
  return <g>{xs.map((x) => <line key={x} x1={x} y1={53} x2={x - 3} y2={53 + len} stroke={color} strokeWidth="3" strokeLinecap="round" />)}</g>
}

export default function WeatherIcon({ code, isDay = true, className = 'size-10', title }: { code: number | null | undefined; isDay?: boolean; className?: string; title?: string }) {
  const k = iconKind(code)
  const Body = isDay ? Sun : Moon
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {k === 'clear' && <Body x={32} y={32} r={isDay ? 12 : 15} />}
      {k === 'partly' && <><g transform="translate(8 -6) scale(.8)"><Body /></g><Cloud dy={2} /></>}
      {k === 'cloudy' && <><Cloud dx={6} dy={-8} fill={CLOUD_DARK} /><Cloud dy={0} /></>}
      {k === 'fog' && (
        <>
          <Cloud dy={-8} />
          {[46, 53, 60].map((y, i) => <line key={y} x1={12 + i * 3} y1={y} x2={52 - i * 3} y2={y} stroke={CLOUD_DARK} strokeWidth="3.5" strokeLinecap="round" />)}
        </>
      )}
      {k === 'drizzle' && <><Cloud dy={-6} /><g transform="translate(0 -6)"><Drops n={3} len={4} /></g></>}
      {k === 'rain' && <><Cloud dy={-6} fill={CLOUD_DARK} /><g transform="translate(0 -6)"><Drops n={3} /></g></>}
      {k === 'heavy' && <><Cloud dy={-6} fill={CLOUD_DARK} /><g transform="translate(0 -6)"><Drops n={4} len={9} /></g></>}
      {k === 'thunder' && (
        <>
          <Cloud dy={-8} fill={CLOUD_DARK} />
          <path d="M34 40l-8 12h7l-4 10 11-14h-7l4-8z" fill={BOLT} />
          <g transform="translate(-6 -8)"><line x1={22} y1={53} x2={19} y2={60} stroke={DROP} strokeWidth="3" strokeLinecap="round" /></g>
          <g transform="translate(18 -8)"><line x1={22} y1={53} x2={19} y2={60} stroke={DROP} strokeWidth="3" strokeLinecap="round" /></g>
        </>
      )}
    </svg>
  )
}

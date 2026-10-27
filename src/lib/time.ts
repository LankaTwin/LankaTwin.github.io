// All timestamps from the APIs are Asia/Colombo wall-clock strings ("2026-10-27T11:00").
// We keep them as wall-clock everywhere so the UI shows Sri Lankan time on any device.

export const colomboNow = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Colombo' }).replace(' ', 'T').slice(0, 16)
export const colomboToday = () => colomboNow().slice(0, 10)

export function addDays(isoDate: string, n: number) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function addHours(wall: string, n: number) {
  const d = new Date(`${wall}:00Z`)
  d.setUTCHours(d.getUTCHours() + n)
  return d.toISOString().slice(0, 16)
}

export const compact = (isoDate: string) => isoDate.replaceAll('-', '')

// Some browsers ship without Sinhala (or Tamil) date data and silently fall back to
// English, so the names are also kept here and used whenever Intl lacks the locale.
const NAMES: Record<'si' | 'ta', { month: string[]; monthAbbr: string[]; dayOfWeek: string[]; dayOfWeekAbbr: string[]; ago: [string, string, string, string, string] }> = {
  si: {
    month: ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'],
    monthAbbr: ['ජන', 'පෙබ', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'],
    dayOfWeek: ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'],
    dayOfWeekAbbr: ['ඉරිදා', 'සඳුදා', 'අඟහ', 'බදාදා', 'බ්‍රහස්', 'සිකු', 'සෙන'],
    ago: ['දැන්', 'තත්පර {n}කට පෙර', 'මිනිත්තු {n}කට පෙර', 'පැය {n}කට පෙර', 'දින {n}කට පෙර'],
  },
  ta: {
    month: ['ஜனவரி', 'பெப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
    monthAbbr: ['ஜன.', 'பெப்.', 'மார்.', 'ஏப்.', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக.', 'செப்.', 'அக்.', 'நவ.', 'டிச.'],
    dayOfWeek: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'],
    dayOfWeekAbbr: ['ஞாயி.', 'திங்.', 'செவ்.', 'புத.', 'வியா.', 'வெள்.', 'சனி'],
    ago: ['இப்போது', '{n} வினாடிகளுக்கு முன்', '{n} நிமிடங்களுக்கு முன்', '{n} மணிநேரத்திற்கு முன்', '{n} நாட்களுக்கு முன்'],
  },
}

/** The built-in names for a locale the browser can't format itself, if we have them. */
function fallback(locale: string) {
  const l = locale.slice(0, 2)
  if (l !== 'si' && l !== 'ta') return undefined
  try { if (Intl.DateTimeFormat.supportedLocalesOf([l]).length) return undefined } catch { /* very old engine */ }
  return NAMES[l]
}

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function dtf(locale: string, opts: Intl.DateTimeFormatOptions) {
  const k = locale + JSON.stringify(opts)
  let f = fmtCache.get(k)
  if (!f) { f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }); fmtCache.set(k, f) }
  return f
}
const utc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`)
/** Short weekday, e.g. "Tue" / "අඟහ" / "செவ்.". */
export function dayName(isoDate: string, locale = 'en-GB') {
  const f = fallback(locale)
  return f ? f.dayOfWeekAbbr[utc(isoDate).getUTCDay()] : dtf(locale === 'en-LK' ? 'en-GB' : locale, { weekday: 'short' }).format(utc(isoDate))
}
/** Day and short month, e.g. "27 Oct". */
export function dayMonth(isoDate: string, locale = 'en-GB') {
  const f = fallback(locale)
  const d = utc(isoDate)
  return f ? `${f.monthAbbr[d.getUTCMonth()]} ${d.getUTCDate()}` : dtf(locale === 'en-LK' ? 'en-GB' : locale, { day: 'numeric', month: 'short' }).format(d)
}

/** "3 minutes ago" in the interface language. */
export function timeAgo(ms: number, locale: string) {
  const s = Math.round((ms - Date.now()) / 1000)
  const f = fallback(locale)
  if (f) {
    const a = Math.abs(s)
    const [unit, n] = a < 10 ? [0, 0] : a < 60 ? [1, a] : a < 3600 ? [2, Math.round(a / 60)] : a < 86400 ? [3, Math.round(a / 3600)] : [4, Math.round(a / 86400)]
    return f.ago[unit].replace('{n}', String(n))
  }
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const a = Math.abs(s)
  if (a < 60) return rtf.format(Math.round(s), 'second')
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  return rtf.format(Math.round(s / 86400), 'day')
}

/** Month and weekday names for chart axes. */
export function calendarNames(locale: string) {
  const f = fallback(locale)
  if (f) return { month: f.month, monthAbbr: f.monthAbbr, dayOfWeek: f.dayOfWeek, dayOfWeekAbbr: f.dayOfWeekAbbr }
  const loc = locale === 'en-LK' ? 'en-GB' : locale
  const months = Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(2026, m, 15)))
  const days = Array.from({ length: 7 }, (_, d) => new Date(Date.UTC(2026, 2, 1 + d))) // 1 Mar 2026 is a Sunday
  return {
    month: months.map((d) => dtf(loc, { month: 'long' }).format(d)),
    monthAbbr: months.map((d) => dtf(loc, { month: 'short' }).format(d)),
    dayOfWeek: days.map((d) => dtf(loc, { weekday: 'long' }).format(d)),
    dayOfWeekAbbr: days.map((d) => dtf(loc, { weekday: 'short' }).format(d)),
  }
}

/** A reading time in Sri Lanka time, e.g. "27 Oct 14:00". */
export function readingTime(ms: number, locale: string) {
  const d = new Date(ms)
  const day = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Colombo' })
  return `${dayMonth(day, locale)} ${hm}`
}

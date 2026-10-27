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

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
const DM = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const dayName = (isoDate: string) => DAY.format(new Date(`${isoDate}T00:00:00Z`))
export const dayMonth = (isoDate: string) => DM.format(new Date(`${isoDate}T00:00:00Z`))

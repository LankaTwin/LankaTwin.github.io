import { useMemo, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import EmergencyContacts from '../components/EmergencyContacts'
import AlertList from '../components/AlertList'
import { Freshness, Skeleton } from '../components/ui'
import { useNowcast, useRivers } from '../hooks/useLiveData'
import { useGauges } from '../hooks/useGauges'
import { buildAlerts, RULES } from '../lib/alerts'
import { notificationsSupported, useTitle } from '../hooks/useApp'
import { useSettings } from '../stores/settings'
import { rich } from '../i18n/core'
import { useT } from '../i18n/useT'


export default function AlertsPage() {
  const { readings, updatedAt, weather } = useNowcast()
  const { rivers } = useRivers()
  const { gauges } = useGauges()
  const { t, lang } = useT()
  const alerts = useMemo(() => buildAlerts(readings, rivers, lang, gauges), [readings, rivers, lang, gauges])
  useTitle(t('signals.title'))
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('signals.title')}</h1>
      <p className="mb-5 mt-1 text-muted">
        {rich(t('signals.intro'), {
          dom: <a className="text-lagoon underline" href="https://www.meteo.gov.lk">{t('common.dom')}</a>,
          dmc: <a className="text-lagoon underline" href="https://www.dmc.gov.lk">{t('common.dmc')}</a>,
        })}
      </p>
      {readings ? <AlertList alerts={alerts} /> : <Skeleton className="h-40" />}
      <p className="mt-3 text-xs text-muted"><Freshness at={updatedAt} fetching={weather.isFetching} /></p>

      <NotifyToggle />

      <h2 className="mb-2 mt-8 text-lg font-bold">{t('emergency.title')}</h2>
      <EmergencyContacts />

      <h2 className="mb-2 mt-8 text-lg font-bold">{t('thresholds.title')}</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">{t('thresholds.signal')}</th><th className="p-3 font-medium">{t('thresholds.watch')}</th><th className="p-3 font-medium">{t('thresholds.warning')}</th><th className="p-3 font-medium">{t('thresholds.basedOn')}</th></tr></thead>
          <tbody className="[&_td]:p-3 [&_tr]:border-b [&_tr]:border-line [&_tr:last-child]:border-0">
            <tr><td>{t('thresholds.rain')}</td><td>{t('thresholds.rainValue', { n: RULES.rain.watch })}</td><td>{t('thresholds.rainValue', { n: RULES.rain.warning })}</td><td className="text-muted">{t('thresholds.rainBasis')}</td></tr>
            <tr><td>{t('thresholds.flood')}</td><td>{t('thresholds.floodValue', { n: RULES.flood.watch })}</td><td>{t('thresholds.floodValue', { n: RULES.flood.warning })}</td><td className="text-muted">{t('thresholds.floodBasis')}</td></tr>
            <tr><td>{t('thresholds.storm')}</td><td>{t('thresholds.stormWatch')}</td><td>{t('thresholds.stormWarn')}</td><td className="text-muted">{t('thresholds.stormBasis')}</td></tr>
            <tr><td>{t('thresholds.heat')}</td><td>{t('thresholds.heatWatch', { n: RULES.heat.watch })}</td><td>{t('thresholds.heatWarn', { n: RULES.heat.warning })}</td><td className="text-muted">{t('thresholds.heatBasis')}</td></tr>
            <tr><td>{t('thresholds.wind')}</td><td>{t('thresholds.gustWatch', { n: RULES.gust.watch })}</td><td>{t('thresholds.gustWarn', { n: RULES.gust.warning })}</td><td className="text-muted">{t('thresholds.windBasis')}</td></tr>
            <tr><td>{t('thresholds.air')}</td><td>{t('thresholds.aqiWatch', { n: RULES.aqi.watch })}</td><td>{RULES.aqi.warning}</td><td className="text-muted">{t('thresholds.airBasis')}</td></tr>
            <tr><td>{t('thresholds.rivers')}</td><td>{t('thresholds.riverWatch', { n: 1.8 })}</td><td>{t('thresholds.riverWarn', { n: 3 })}</td><td className="text-muted">{t('thresholds.riverBasis')}</td></tr>
            <tr><td>{t('thresholds.gauges')}</td><td>{t('gaugeLevel.alert')}</td><td>{t('gaugeLevel.minor')} / {t('gaugeLevel.major')}</td><td className="text-muted">{t('thresholds.gaugesBasis')}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NotifyToggle() {
  const { notify, setNotify } = useSettings()
  const { t } = useT()
  const [perm, setPerm] = useState(() => (notificationsSupported() ? Notification.permission : 'denied'))
  if (!notificationsSupported()) return null
  const on = notify && perm === 'granted'
  const toggle = async () => {
    if (on) { setNotify(false); return }
    const p = perm === 'granted' ? perm : await Notification.requestPermission()
    setPerm(p)
    setNotify(p === 'granted')
  }
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 font-semibold">{on ? <Bell className="size-4 text-lagoon" aria-hidden /> : <BellOff className="size-4 text-muted" aria-hidden />} {t('notify.title')}</h2>
        <p className="text-sm text-muted">
          {perm === 'denied'
            ? t('notify.blocked')
            : t('notify.desc')}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={perm === 'denied'}
        aria-pressed={on}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${on ? 'border border-line bg-surface hover:bg-sunken' : 'bg-lagoon text-canvas hover:brightness-110'}`}
      >
        {t(on ? 'notify.off' : 'notify.on')}
      </button>
    </div>
  )
}

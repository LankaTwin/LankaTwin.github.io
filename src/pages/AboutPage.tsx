import { Link } from 'react-router-dom'
import { useSettings } from '../stores/settings'
import Scene from '../components/Scene'
import { REPO_URL } from '../components/Layout'
import { useTitle } from '../hooks/useApp'
import { LANGS, rich, type Key, type Lang } from '../i18n/core'
import { useT } from '../i18n/useT'

const ROADMAP: { phase: 'Now' | 'Next' | 'Later'; items: [Key, boolean][] }[] = [
  { phase: 'Now', items: [
    ['road.map', true],
    ['road.rivers', true],
    ['road.overlays', true],
    ['road.stations', true],
    ['road.compare', true],
    ['road.search', true],
    ['road.photos', true],
    ['road.space', true],
    ['road.embed', true],
    ['road.i18n', true],
    ['road.floods', true],
    ['road.spot', true],
  ] },
  { phase: 'Next', items: [
    ['road.gauges', false],
    ['road.basins', false],
    ['road.landslide', false],
  ] },
  { phase: 'Later', items: [
    ['road.playback', false],
    ['road.agri', false],
    ['road.push', false],
  ] },
]

export default function AboutPage() {
  const { refreshMinutes, setRefresh, lang, setLang } = useSettings()
  const { t } = useT()
  useTitle(t('nav.about'))
  return (
    <div className="prose-lt mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl" aria-hidden>
        <Scene id="coast" shade={false} caption={false} sizes="33vw" className="h-28 w-full sm:h-40" />
        <Scene id="hills" shade={false} caption={false} sizes="33vw" className="h-28 w-full sm:h-40" />
        <Scene id="plains" shade={false} caption={false} sizes="33vw" className="h-28 w-full sm:h-40" />
      </div>
      <h1 className="mb-3 text-3xl font-extrabold tracking-tight">{t('about.title')}</h1>
      <p className="text-lg">{t('about.lead')}</p>

      <h2>{t('about.nameTitle')}</h2>
      <p>{rich(t('about.name'), { full: <b>{t('brand.fullName')}</b> })}</p>

      <h2>{t('about.howTitle')}</h2>
      <p>{t('about.how')}</p>
      <ul>
        <li><b>{t('about.howRainTitle')}</b> {t('about.howRain')}</li>
        <li><b>{t('about.howRiverTitle')}</b> {t('about.howRiver')}</li>
        <li><b>{t('about.howDecadeTitle')}</b> {t('about.howDecade')}</li>
        <li><b>{t('about.howSignalsTitle')}</b> {rich(t('about.howSignals'), { link: <Link to="/alerts">{t('about.signalsLink')}</Link> })}</li>
      </ul>

      <h2>{t('about.notTitle')}</h2>
      <p>{rich(t('about.not'), { n: <b>117</b> })}</p>

      <h2>{t('about.roadmap')}</h2>
      {ROADMAP.map((r) => (
        <div key={r.phase}>
          <h3>{t(`about.phase.${r.phase}`)}</h3>
          <ul className="!list-none !pl-0">
            {r.items.map(([k, done]) => (
              <li key={k} className="flex gap-2"><span aria-label={t(done ? 'about.done' : 'about.notStarted')} className={done ? 'text-paddy' : 'text-muted'}>{done ? '✓' : '○'}</span>{t(k)}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2>{t('about.shortcutsTitle')}</h2>
      <ul>
        <li>{rich(t('about.shortcutSearch'), { k1: <b>/</b>, k2: <b>Ctrl K</b>, k3: <b>⌘ K</b> })}</li>
        <li>{rich(t('about.shortcutNear'), { b: <b>{t('dash.nearMe')}</b> })}</li>
        <li>{rich(t('about.shortcutStar'), { b: <b>{t('about.star')}</b> })}</li>
      </ul>

      <h2>{t('about.imagesTitle')}</h2>
      <p>{t('about.images')}</p>

      <h2>{t('about.languageTitle')}</h2>
      <p>{t('about.language')}</p>

      <h2>{t('about.settingsTitle')}</h2>
      <p className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-3">
          {t('layout.language')}
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-lg border border-line bg-surface px-2 py-1">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3">
          {t('about.refresh')}
          <select value={refreshMinutes} onChange={(e) => setRefresh(+e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1">
            {[5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{t('about.minutes', { n })}</option>)}
          </select>
        </label>
      </p>

      <h2>{t('about.contributeTitle')}</h2>
      <p>{rich(t('about.contribute'), { link: <a href={REPO_URL}>GitHub</a> })}</p>
    </div>
  )
}

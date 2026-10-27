import { beforeEach, describe, expect, it } from 'vitest'
import type { Alert } from '../../lib/alerts'
import { sortLog, useAlertLog } from '../alertLog'

const a = (id: string, level: Alert['level'] = 'watch'): Alert => ({ id, level, kind: 'rain', title: 't', detail: 'd', place: 'p', href: '/station/x' })

describe('alert log', () => {
  beforeEach(() => useAlertLog.setState({ entries: {}, openedAt: 0 }))

  it('records first sighting, escalation and clearing', () => {
    const { update } = useAlertLog.getState()
    expect(update([a('rain-galle')], 1000).added).toHaveLength(1)
    expect(update([a('rain-galle')], 2000).added).toHaveLength(0)
    const up = update([a('rain-galle', 'warning')], 3000)
    expect(up.escalated.map((e) => e.id)).toEqual(['rain-galle'])
    update([], 4000)
    const e = useAlertLog.getState().entries['rain-galle']
    expect(e).toMatchObject({ firstSeen: 1000, escalatedAt: 3000, clearedAt: 4000, level: 'warning' })
  })

  it('treats a signal that returns after clearing as new', () => {
    const { update } = useAlertLog.getState()
    update([a('x')], 1000); update([], 2000)
    expect(update([a('x')], 3000).added).toHaveLength(1)
    expect(useAlertLog.getState().entries.x.clearedAt).toBeUndefined()
  })

  it('drops cleared signals after 12 hours', () => {
    const { update } = useAlertLog.getState()
    update([a('x')], 0); update([], 1)
    update([], 13 * 3600_000)
    expect(useAlertLog.getState().entries.x).toBeUndefined()
  })

  it('orders active warnings, then watches, then cleared', () => {
    const { update } = useAlertLog.getState()
    update([a('w1'), a('c1'), a('w2', 'warning')], 1)
    update([a('w1'), a('w2', 'warning')], 2)
    expect(sortLog(Object.values(useAlertLog.getState().entries)).map((e) => e.id)).toEqual(['w2', 'w1', 'c1'])
  })
})

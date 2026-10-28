import { describe, expect, it } from 'vitest'
import { FLOOD_WEIGHTS, floodLevel, floodRisk, nearestRiver } from '../flood'
import { cld, cldSrcSet, CLOUD } from '../cloudinary'
import { stationById } from '../places'

const dry = { rain24: 0, rainNext24: 0, riverRatio: 1, elevation: 5 }

describe('flood risk', () => {
  it('is low on a dry day, even on low ground', () => {
    expect(floodRisk(dry)).toMatchObject({ score: 0, level: 'low' })
  })

  it('caps each part at its weight', () => {
    const r = floodRisk({ rain24: 400, rainNext24: 0, riverRatio: 20, elevation: 2 })
    expect(r.parts).toEqual({ rain: FLOOD_WEIGHTS.rain, river: FLOOD_WEIGHTS.river, terrain: FLOOD_WEIGHTS.terrain })
    expect(r.score).toBe(100)
    expect(r.level).toBe('very-high')
  })

  it('uses the wetter of the past and next 24 hours', () => {
    expect(floodRisk({ ...dry, rain24: 10, rainNext24: 75 }).parts.rain).toBe(Math.round(FLOOD_WEIGHTS.rain / 2))
  })

  it('counts low ground only when there is water', () => {
    const wet = { ...dry, rain24: 100 }
    expect(floodRisk({ ...wet, elevation: 5 }).score).toBeGreaterThan(floodRisk({ ...wet, elevation: 800 }).score)
    expect(floodRisk({ ...dry, elevation: 1 }).parts.terrain).toBe(0)
  })

  it('treats unknown river and elevation as neutral', () => {
    expect(() => floodRisk({ rain24: null, rainNext24: null, riverRatio: null, elevation: null })).not.toThrow()
  })

  it('grades scores into levels', () => {
    expect([0, 24, 25, 44, 45, 64, 65, 100].map(floodLevel)).toEqual(['low', 'low', 'moderate', 'moderate', 'high', 'high', 'very-high', 'very-high'])
  })

  it('pairs towns with a river point only when one is close', () => {
    expect(nearestRiver(stationById('ratnapura')!)?.point.id).toBe('kalu-ratnapura')
    expect(nearestRiver(stationById('jaffna')!)).toBeUndefined()
  })
})

describe('cloudinary', () => {
  it('builds optimised delivery URLs', () => {
    expect(cld('lankatwin/scenes/hills', 'w_800')).toBe(`https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_800/lankatwin/scenes/hills`)
    expect(cldSrcSet('lankatwin/scenes/coast', [480, 960])).toMatch(/c_fill,w_480\/lankatwin\/scenes\/coast 480w, .*w_960.* 960w$/)
  })
})

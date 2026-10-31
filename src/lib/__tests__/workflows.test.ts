import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

// GitHub rejects a workflow file it can't parse without failing any pull-request check, so a
// broken deploy.yml would only show up as a silent failed deploy. Catch it in the tests instead.
const DIR = '.github/workflows'
const files = readdirSync(DIR).filter((f) => f.endsWith('.yml'))

describe('GitHub workflows', () => {
  it.each(files)('%s parses and every step runs or uses something', (file) => {
    const wf = parse(readFileSync(`${DIR}/${file}`, 'utf8'), { strict: true, uniqueKeys: true }) as { jobs: Record<string, { steps: Record<string, unknown>[] }> }
    expect(Object.keys(wf.jobs).length).toBeGreaterThan(0)
    for (const job of Object.values(wf.jobs)) {
      for (const step of job.steps) expect('run' in step || 'uses' in step).toBe(true)
    }
  })

  it.each(files)('%s pins every action to a full commit SHA', (file) => {
    const uses = [...readFileSync(`${DIR}/${file}`, 'utf8').matchAll(/uses:\s*(\S+)/g)].map((m) => m[1])
    for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/)
  })
})

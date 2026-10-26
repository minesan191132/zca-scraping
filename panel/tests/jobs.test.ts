import { describe, expect, it } from 'vitest'
import { isSetId, jobSteps, parseJobRequest } from '../src/shared/bots'

describe('jobSteps', () => {
  it('run: only the day rebuild, for the chosen sets in one command', () => {
    expect(jobSteps({ mode: 'run', sets: ['NguoiA', 'NguoiB'], slot: 'morning' })).toEqual([
      ['run', 'today', '--', '--set', 'NguoiA,NguoiB']
    ])
  })

  it('run-print: rebuild then total with --print, both limited to the same sets', () => {
    expect(jobSteps({ mode: 'run-print', sets: ['NguoiA'], slot: 'afternoon' })).toEqual([
      ['run', 'today', '--', '--set', 'NguoiA'],
      ['run', 'total:once', '--', '--slot', 'afternoon', '--set', 'NguoiA', '--print']
    ])
  })

  it('total and total-print skip the rebuild; no sets means no --set', () => {
    expect(jobSteps({ mode: 'total', sets: [], slot: 'morning' })).toEqual([
      ['run', 'total:once', '--', '--slot', 'morning']
    ])
    expect(jobSteps({ mode: 'total-print', sets: [], slot: 'morning' })).toEqual([
      ['run', 'total:once', '--', '--slot', 'morning', '--print']
    ])
  })

  it('run with no sets is the plain "today" command', () => {
    expect(jobSteps({ mode: 'run', sets: [], slot: 'morning' })).toEqual([['run', 'today']])
  })
})

describe('parseJobRequest', () => {
  it('accepts a good request and drops repeated sets', () => {
    expect(
      parseJobRequest({ mode: 'total', sets: ['A', 'A', 'NguoiA B'], slot: 'afternoon' })
    ).toEqual({
      mode: 'total',
      sets: ['A', 'NguoiA B'],
      slot: 'afternoon'
    })
  })

  it('refuses a wrong mode, slot or shape', () => {
    expect(parseJobRequest(null)).toBeNull()
    expect(parseJobRequest({ mode: 'rm', sets: [], slot: 'morning' })).toBeNull()
    expect(parseJobRequest({ mode: 'run', sets: [], slot: 'night' })).toBeNull()
    expect(parseJobRequest({ mode: 'run', sets: 'A', slot: 'morning' })).toBeNull()
  })

  it('refuses set names that could change a cmd.exe command line', () => {
    for (const bad of ['A&calc', 'A|B', 'A,B', '"A"', 'A%PATH%', 'A^B', '', ' A', 'A<B', 'A\nB']) {
      expect(isSetId(bad), JSON.stringify(bad)).toBe(false)
      expect(parseJobRequest({ mode: 'run', sets: [bad], slot: 'morning' })).toBeNull()
    }
    expect(isSetId('NguoiA')).toBe(true)
    expect(isSetId('NguoiB 2')).toBe(true)
  })
})

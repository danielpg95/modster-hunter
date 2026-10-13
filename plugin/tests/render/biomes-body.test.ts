import { describe, expect, test } from 'claude-code/testing'
import { biomesBody } from '../../hooks/render'

// P3-03: the biome list beside the odds when both fit across, else above them in
// a few rows; the scene on top only when the list keeps 3 rows (0028).

describe('biomesBody', () => {
  test('a wide pane puts the list beside the odds, with every row', () => {
    expect(biomesBody({ columns: 120, rows: 5 })).toEqual({ split: 'side', listRows: 5, showScene: false })
    expect(biomesBody({ columns: 76, rows: 5 })).toEqual({ split: 'side', listRows: 5, showScene: false })
  })

  test('a narrow pane stacks the list above the odds, in at most 3 rows', () => {
    expect(biomesBody({ columns: 75, rows: 20 })).toEqual({ split: 'stack', listRows: 3, showScene: false })
    expect(biomesBody({ columns: 40, rows: 2 })).toEqual({ split: 'stack', listRows: 2, showScene: false })
  })

  test('no room still keeps one row for the list', () => {
    expect(biomesBody({ columns: 120, rows: 0 }).listRows).toBe(1)
    expect(biomesBody({ columns: 40, rows: -1 }).listRows).toBe(1)
  })

  test('the scene shows when the list keeps 3 rows, and takes its rows from the list', () => {
    expect(biomesBody({ columns: 120, rows: 20, sceneRows: 6 })).toEqual({ split: 'side', listRows: 14, showScene: true })
    expect(biomesBody({ columns: 120, rows: 9, sceneRows: 6 })).toEqual({ split: 'side', listRows: 3, showScene: true })
    expect(biomesBody({ columns: 50, rows: 9, sceneRows: 6 })).toEqual({ split: 'stack', listRows: 3, showScene: true })
  })

  test('a short pane leaves the scene out', () => {
    expect(biomesBody({ columns: 120, rows: 8, sceneRows: 6 })).toEqual({ split: 'side', listRows: 8, showScene: false })
    expect(biomesBody({ columns: 120, rows: 5, sceneRows: 6 }).showScene).toBe(false)
  })
})

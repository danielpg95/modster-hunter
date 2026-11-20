import { describe, expect, test } from 'claude-code/testing'
import { cardsInBudget } from '../../hooks/render'

describe('cardsInBudget (0054 point 6)', () => {
  test('every card keeps its art while the page fits', () => {
    expect(cardsInBudget([10, 20, 30], 0, 60)).toEqual([true, true, true])
  })

  test('over the budget, only the cards that do not fit lose their art, in order', () => {
    expect(cardsInBudget([30, 30, 30, 10], 0, 70)).toEqual([true, true, false, true])
  })

  test('the selected card is counted first, so it keeps its art', () => {
    expect(cardsInBudget([40, 40, 40], 2, 80)).toEqual([true, false, true])
  })

  test('a card with no art, or one bigger than the whole budget, is left out', () => {
    expect(cardsInBudget([undefined, 200, 50], 1, 100)).toEqual([false, false, true])
  })

  test('no selection on the page counts from the first card', () => {
    expect(cardsInBudget([60, 60], -1, 100)).toEqual([true, false])
  })
})

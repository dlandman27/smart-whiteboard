import { describe, it, expect, beforeEach } from 'vitest'
import { useUndoStore } from './undo'
import type { WidgetLayout } from '../types'

const store = () => useUndoStore.getState()

const snapshot: WidgetLayout = {
  id: 'w1',
  databaseTitle: 'Test',
  x: 10,
  y: 20,
  width: 200,
  height: 150,
}

beforeEach(() => {
  useUndoStore.setState(useUndoStore.getInitialState(), true)
})

describe('useUndoStore', () => {
  it('starts with empty stack', () => {
    expect(store().stack).toEqual([])
  })

  it('pushes an undo entry', () => {
    store().push('Remove widget', snapshot)
    expect(store().stack).toHaveLength(1)
    expect(store().stack[0].label).toBe('Remove widget')
    expect(store().stack[0].snapshot).toEqual(snapshot)
  })

  it('stacks multiple entries (most recent first)', () => {
    store().push('First', snapshot)
    store().push('Second', { ...snapshot, id: 'w2' })
    expect(store().stack).toHaveLength(2)
    expect(store().stack[0].label).toBe('Second')
    expect(store().stack[1].label).toBe('First')
  })

  it('caps at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      store().push(`Entry ${i}`, { ...snapshot, id: `w${i}` })
    }
    expect(store().stack).toHaveLength(10)
    expect(store().stack[0].label).toBe('Entry 14')
  })

  it('pops the most recent entry', () => {
    store().push('First', snapshot)
    store().push('Second', { ...snapshot, id: 'w2' })
    const popped = store().pop()
    expect(popped?.label).toBe('Second')
    expect(store().stack).toHaveLength(1)
    expect(store().stack[0].label).toBe('First')
  })

  it('pop returns null on empty stack', () => {
    expect(store().pop()).toBeNull()
  })

  it('clears the entire stack', () => {
    store().push('First', snapshot)
    store().push('Second', { ...snapshot, id: 'w2' })
    store().clear()
    expect(store().stack).toEqual([])
  })
})

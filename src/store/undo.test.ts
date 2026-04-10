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
  it('starts with no entry', () => {
    expect(store().entry).toBeNull()
  })

  it('pushes an undo entry', () => {
    store().push('Remove widget', snapshot)
    expect(store().entry).not.toBeNull()
    expect(store().entry!.label).toBe('Remove widget')
    expect(store().entry!.snapshot).toEqual(snapshot)
    expect(store().entry!.id).toBeTruthy()
  })

  it('replaces previous entry on subsequent push', () => {
    store().push('First', snapshot)
    const firstId = store().entry!.id
    store().push('Second', { ...snapshot, id: 'w2' })
    expect(store().entry!.label).toBe('Second')
    expect(store().entry!.id).not.toBe(firstId)
  })

  it('clears the entry', () => {
    store().push('Remove widget', snapshot)
    store().clear()
    expect(store().entry).toBeNull()
  })
})

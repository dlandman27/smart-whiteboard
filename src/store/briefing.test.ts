import { describe, it, expect, beforeEach } from 'vitest'
import { useBriefingStore } from './briefing'

const store = () => useBriefingStore.getState()

beforeEach(() => {
  useBriefingStore.setState(useBriefingStore.getInitialState(), true)
})

describe('useBriefingStore — initial state', () => {
  it('starts with text as null', () => {
    expect(store().text).toBeNull()
  })
})

describe('trigger', () => {
  it('sets text to the provided string', () => {
    store().trigger('Good morning!')
    expect(store().text).toBe('Good morning!')
  })

  it('overwrites an existing text value', () => {
    store().trigger('First message')
    store().trigger('Second message')
    expect(store().text).toBe('Second message')
  })

  it('can set an empty string', () => {
    store().trigger('')
    expect(store().text).toBe('')
  })
})

describe('clear', () => {
  it('sets text back to null', () => {
    store().trigger('Some text')
    store().clear()
    expect(store().text).toBeNull()
  })

  it('is a no-op when text is already null', () => {
    store().clear()
    expect(store().text).toBeNull()
  })
})

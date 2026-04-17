import { describe, it, expect, beforeEach } from 'vitest'
import { useSpotifyCredentials } from './spotify'

const store = () => useSpotifyCredentials.getState()

beforeEach(() => {
  useSpotifyCredentials.setState(useSpotifyCredentials.getInitialState(), true)
})

describe('useSpotifyCredentials — initial state', () => {
  it('starts with empty clientId', () => {
    expect(store().clientId).toBe('')
  })

  it('starts with empty clientSecret', () => {
    expect(store().clientSecret).toBe('')
  })

  it('starts with the default redirectUri', () => {
    expect(store().redirectUri).toBe('http://localhost:3001/api/spotify/callback')
  })
})

describe('set', () => {
  it('updates clientId', () => {
    store().set({ clientId: 'my-client-id' })
    expect(store().clientId).toBe('my-client-id')
  })

  it('updates clientSecret', () => {
    store().set({ clientSecret: 'super-secret' })
    expect(store().clientSecret).toBe('super-secret')
  })

  it('updates redirectUri', () => {
    store().set({ redirectUri: 'http://example.com/callback' })
    expect(store().redirectUri).toBe('http://example.com/callback')
  })

  it('applies a partial patch without touching other fields', () => {
    store().set({ clientId: 'abc' })
    expect(store().clientSecret).toBe('')
    expect(store().redirectUri).toBe('http://localhost:3001/api/spotify/callback')
  })

  it('applies a full patch at once', () => {
    store().set({ clientId: 'id1', clientSecret: 'sec1', redirectUri: 'http://x.com/cb' })
    expect(store().clientId).toBe('id1')
    expect(store().clientSecret).toBe('sec1')
    expect(store().redirectUri).toBe('http://x.com/cb')
  })

  it('can clear a field by setting it to an empty string', () => {
    store().set({ clientId: 'something' })
    store().set({ clientId: '' })
    expect(store().clientId).toBe('')
  })

  it('setting the same value is idempotent', () => {
    store().set({ clientId: 'same' })
    store().set({ clientId: 'same' })
    expect(store().clientId).toBe('same')
  })
})

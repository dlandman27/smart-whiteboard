import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../lib/apiFetch'
import {
  useNotionHealth,
  useNotionDatabases,
  useNotionPages,
  useUpdatePage,
  useCreatePage,
  useArchivePage,
} from './useNotion'

const mockApiFetch = vi.mocked(apiFetch)

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useNotionHealth', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('returns health data when fetch succeeds', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true, configured: true })
    const { result } = renderHook(() => useNotionHealth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ ok: true, configured: true })
    expect(mockApiFetch).toHaveBeenCalledWith('/api/health')
  })

  it('enters error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('server error'))
    const { result } = renderHook(() => useNotionHealth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useNotionDatabases', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('returns database list when fetch succeeds', async () => {
    mockApiFetch.mockResolvedValueOnce({ results: [{ id: 'db-1', title: 'Tasks' }] })
    const { result } = renderHook(() => useNotionDatabases(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.results).toHaveLength(1)
    expect(mockApiFetch).toHaveBeenCalledWith('/api/databases')
  })
})

describe('useNotionPages', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('fetches pages for a given databaseId', async () => {
    mockApiFetch.mockResolvedValueOnce({ results: [{ id: 'page-1' }] })
    const { result } = renderHook(() => useNotionPages('db-1'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.results).toHaveLength(1)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/databases/db-1/query',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('does not fetch when databaseId is empty', async () => {
    const { result } = renderHook(() => useNotionPages(''), { wrapper: makeWrapper() })
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.isFetching).toBe(false)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})

describe('useUpdatePage', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('calls PATCH on the correct page', async () => {
    mockApiFetch.mockResolvedValueOnce({})
    const { result } = renderHook(() => useUpdatePage('db-1'), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync({ pageId: 'page-1', properties: { Status: 'Done' } })
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/pages/page-1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})

describe('useCreatePage', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('calls POST to create a page', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'new-page' })
    const { result } = renderHook(() => useCreatePage('db-1'), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync({ Name: 'New Task' })
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/databases/db-1/pages',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('useArchivePage', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('calls DELETE on the correct page', async () => {
    mockApiFetch.mockResolvedValueOnce({})
    const { result } = renderHook(() => useArchivePage('db-1'), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync('page-1')
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/pages/page-1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})

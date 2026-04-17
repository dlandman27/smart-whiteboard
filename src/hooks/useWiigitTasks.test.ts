import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('../lib/apiFetch', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '../lib/apiFetch'
import { useWiigitTasks, useToggleWiigitTask, useCreateWiigitTask } from './useWiigitTasks'

const mockApiFetch = vi.mocked(apiFetch)

const TASKS = [
  { id: 't1', title: 'Buy milk',    notes: null, status: 'needsAction', priority: 2, due: null, list_name: 'Personal', completed_at: null, created_at: '2024-01-01' },
  { id: 't2', title: 'Send report', notes: 'urgent', status: 'completed', priority: 1, due: '2024-02-01', list_name: 'Work', completed_at: '2024-01-30', created_at: '2024-01-01' },
]

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useWiigitTasks', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('fetches all tasks when no listName provided', async () => {
    mockApiFetch.mockResolvedValueOnce(TASKS)
    const { result } = renderHook(() => useWiigitTasks(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks')
  })

  it('fetches tasks for a specific list when listName provided', async () => {
    mockApiFetch.mockResolvedValueOnce([TASKS[0]])
    const { result } = renderHook(() => useWiigitTasks('Personal'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks?list_name=Personal')
  })

  it('URL-encodes list names with special characters', async () => {
    mockApiFetch.mockResolvedValueOnce([])
    renderHook(() => useWiigitTasks('My List'), { wrapper: makeWrapper() })
    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks?list_name=My%20List')
  })

  it('enters error state when fetch fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'))
    const { result } = renderHook(() => useWiigitTasks(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useToggleWiigitTask', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('sends PATCH with completed → needsAction', async () => {
    mockApiFetch.mockResolvedValueOnce({})
    const { result } = renderHook(() => useToggleWiigitTask(), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync({ id: 't1', completed: true })
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/tasks/t1',
      expect.objectContaining({ method: 'PATCH' })
    )
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.status).toBe('needsAction')
  })

  it('sends PATCH with incomplete → completed', async () => {
    mockApiFetch.mockResolvedValueOnce({})
    const { result } = renderHook(() => useToggleWiigitTask(), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync({ id: 't2', completed: false })
    })
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.status).toBe('completed')
  })
})

describe('useCreateWiigitTask', () => {
  beforeEach(() => mockApiFetch.mockReset())

  it('sends POST with title and list_name', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'new-task' })
    const { result } = renderHook(() => useCreateWiigitTask('Personal'), { wrapper: makeWrapper() })
    await act(async () => {
      await result.current.mutateAsync('Read a book')
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(mockApiFetch.mock.calls[0][1]!.body as string)
    expect(body.title).toBe('Read a book')
    expect(body.list_name).toBe('Personal')
  })

  it('enters error state when creation fails', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Server error'))
    const { result } = renderHook(() => useCreateWiigitTask('Work'), { wrapper: makeWrapper() })
    await act(async () => {
      try { await result.current.mutateAsync('Fail') } catch { /* expected */ }
    })
    expect(result.current.isError).toBe(true)
  })
})

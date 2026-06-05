import { getClientApiBaseUrl } from '@/lib/env'
import type { Board } from '@/types/board'
import type { BoardSettings } from '@/types/boardSettings'
import type { CanvasElement } from '@/types/canvas'

export type PatchBoardPayload = {
  name?: string
  settings?: Partial<BoardSettings>
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${getClientApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    })
  } catch {
    throw new Error(
      process.env.NODE_ENV === 'production'
        ? 'Cannot reach the DrawSpace API. Check NEXT_PUBLIC_API_URL and that the backend is deployed.'
        : 'Cannot reach the DrawSpace server. Make sure the backend is running (pnpm dev in /backend).'
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function getBoards(token: string): Promise<Board[]> {
  const data = await apiFetch<{ boards: Board[] }>('/api/boards', {}, token)
  return data.boards
}

export async function createBoard(name: string, token: string): Promise<Board> {
  const data = await apiFetch<{ board: Board }>(
    '/api/boards',
    { method: 'POST', body: JSON.stringify({ name }) },
    token
  )
  return data.board
}

export async function getBoard(boardId: string, token: string): Promise<Board> {
  const data = await apiFetch<{ board: Board }>(
    `/api/boards/${boardId}`,
    {},
    token
  )
  return data.board
}

export async function patchBoard(
  boardId: string,
  payload: PatchBoardPayload,
  token: string
): Promise<Board> {
  const data = await apiFetch<{ board: Board }>(
    `/api/boards/${boardId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token
  )
  return data.board
}

export async function updateBoard(
  boardId: string,
  name: string,
  token: string
): Promise<Board> {
  return patchBoard(boardId, { name }, token)
}

export async function saveBoard(
  boardId: string,
  elements: CanvasElement[],
  token: string
): Promise<{ savedAt: string; elementCount: number }> {
  const data = await apiFetch<{
    success: true
    savedAt: string
    elementCount: number
  }>(
    `/api/boards/${boardId}/save`,
    { method: 'POST', body: JSON.stringify({ elements }) },
    token
  )
  return { savedAt: data.savedAt, elementCount: data.elementCount }
}

export async function deleteBoard(boardId: string, token: string): Promise<void> {
  await apiFetch<{ success: true }>(
    `/api/boards/${boardId}`,
    { method: 'DELETE' },
    token
  )
}

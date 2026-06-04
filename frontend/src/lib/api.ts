import type { Board } from '@/types/board'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

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

export async function updateBoard(
  boardId: string,
  name: string,
  token: string
): Promise<Board> {
  const data = await apiFetch<{ board: Board }>(
    `/api/boards/${boardId}`,
    { method: 'PATCH', body: JSON.stringify({ name }) },
    token
  )
  return data.board
}

export async function deleteBoard(boardId: string, token: string): Promise<void> {
  await apiFetch<{ success: true }>(
    `/api/boards/${boardId}`,
    { method: 'DELETE' },
    token
  )
}

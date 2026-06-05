import { create } from 'zustand'
import type { CanvasElement, HistoryEntry, KonvaData, ToolType } from '@/types/canvas'

/* ─── public diff type ──────────────────────────────────────── */

export type UndoDiff = {
  added:   CanvasElement[]   // elements that appeared in the "after" state
  removed: CanvasElement[]   // elements that were in "before" but not "after"
  updated: CanvasElement[]   // elements in both but with a different updatedAt
}

function computeDiff(before: CanvasElement[], after: CanvasElement[]): UndoDiff {
  const beforeMap = new Map(before.map((e) => [e.elementId, e]))
  const afterMap  = new Map(after.map((e) => [e.elementId, e]))
  return {
    added:   after.filter((e) => !beforeMap.has(e.elementId)),
    removed: before.filter((e) => !afterMap.has(e.elementId)),
    updated: after.filter((e) => {
      const prev = beforeMap.get(e.elementId)
      return prev !== undefined && prev.updatedAt !== e.updatedAt
    }),
  }
}

/* ─── store interface ───────────────────────────────────────── */

interface CanvasStore {
  activeTool:   ToolType
  strokeColor:  string
  fillColor:    string
  strokeWidth:  number
  elements:     CanvasElement[]
  selectedIds:  string[]
  history:      HistoryEntry[]
  historyIndex: number

  setTool:        (tool: ToolType) => void
  setStrokeColor: (color: string) => void
  setFillColor:   (color: string) => void
  setStrokeWidth: (width: number) => void

  setSelectedIds:  (ids: string[]) => void
  setSelectedId:   (id: string | null) => void
  toggleSelectedId:(id: string) => void

  /* local (push to history) */
  addElement:    (el: CanvasElement) => void
  updateElement: (elementId: string, data: Partial<KonvaData>) => void
  deleteElement: (elementId: string) => void
  deleteElements:(elementIds: string[]) => void

  /* remote (NO history) */
  addElementRemote:    (el: CanvasElement) => void
  updateElementRemote: (elementId: string, data: Partial<KonvaData>) => void
  deleteElementRemote: (elementId: string) => void

  setElements: (elements: CanvasElement[]) => void

  showGrid:    boolean
  setShowGrid: (show: boolean) => void

  stageScale:    number
  setStageScale: (scale: number) => void

  /** Returns the diff between before/after so the caller can sync to server */
  undo: () => UndoDiff | null
  redo: () => UndoDiff | null
}

/* ─── history helpers ───────────────────────────────────────── */

function snapshot(
  currentHistory: HistoryEntry[],
  currentIndex:   number,
  newElements:    CanvasElement[]
): Pick<CanvasStore, 'history' | 'historyIndex' | 'elements'> {
  const entry: HistoryEntry = { elements: [...newElements], timestamp: Date.now() }
  const trimmed = currentHistory.slice(0, currentIndex + 1)
  const history = [...trimmed, entry].slice(-50)
  return { elements: newElements, history, historyIndex: history.length - 1 }
}

/* ─── store ─────────────────────────────────────────────────── */

export const useCanvasStore = create<CanvasStore>((set) => ({
  activeTool:   'pen',
  strokeColor:  '#6C63FF',
  fillColor:    'transparent',
  strokeWidth:  2,
  elements:     [],
  selectedIds:  [],
  history:      [],
  historyIndex: -1,

  setTool:        (tool)        => set({ activeTool: tool, selectedIds: [] }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor:   (fillColor)   => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),

  setSelectedIds:   (selectedIds) => set({ selectedIds }),
  setSelectedId:    (id)          => set({ selectedIds: id ? [id] : [] }),
  toggleSelectedId: (id)          =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id],
    })),

  /* ── local actions (push history) ──────────────────────── */

  addElement: (el) =>
    set((state) => snapshot(state.history, state.historyIndex, [...state.elements, el])),

  updateElement: (elementId, dataUpdate) =>
    set((state) => {
      const newElements = state.elements.map((el) =>
        el.elementId === elementId
          ? { ...el, data: { ...el.data, ...dataUpdate }, updatedAt: Date.now() }
          : el
      )
      return snapshot(state.history, state.historyIndex, newElements)
    }),

  deleteElement: (elementId) =>
    set((state) => ({
      ...snapshot(
        state.history,
        state.historyIndex,
        state.elements.filter((el) => el.elementId !== elementId)
      ),
      selectedIds: state.selectedIds.filter((id) => id !== elementId),
    })),

  deleteElements: (elementIds) =>
    set((state) => {
      const idSet = new Set(elementIds)
      return {
        ...snapshot(
          state.history,
          state.historyIndex,
          state.elements.filter((el) => !idSet.has(el.elementId))
        ),
        selectedIds: state.selectedIds.filter((id) => !idSet.has(id)),
      }
    }),

  /* ── remote actions (NO history) ───────────────────────── */

  addElementRemote: (el) =>
    set((state) => ({ elements: [...state.elements, el] })),

  updateElementRemote: (elementId, dataUpdate) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.elementId === elementId
          ? { ...el, data: { ...el.data, ...dataUpdate }, updatedAt: Date.now() }
          : el
      ),
    })),

  deleteElementRemote: (elementId) =>
    set((state) => ({
      elements:    state.elements.filter((el) => el.elementId !== elementId),
      selectedIds: state.selectedIds.filter((id) => id !== elementId),
    })),

  setElements: (elements) => set({ elements }),

  showGrid:    true,
  setShowGrid: (showGrid) => set({ showGrid }),

  stageScale:    1,
  setStageScale: (stageScale) => set({ stageScale }),

  /* ── undo ───────────────────────────────────────────────── */

  undo: () => {
    let diff: UndoDiff | null = null
    set((state) => {
      if (state.historyIndex < 0) return state
      const before   = state.elements
      const newIndex = state.historyIndex - 1
      const after    = newIndex < 0 ? [] : state.history[newIndex].elements
      diff = computeDiff(before, after)
      return { historyIndex: newIndex, elements: after, selectedIds: [] }
    })
    return diff
  },

  /* ── redo ───────────────────────────────────────────────── */

  redo: () => {
    let diff: UndoDiff | null = null
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state
      const before   = state.elements
      const newIndex = state.historyIndex + 1
      const after    = state.history[newIndex].elements
      diff = computeDiff(before, after)
      return { historyIndex: newIndex, elements: after }
    })
    return diff
  },
}))

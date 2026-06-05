import { create } from 'zustand'
import type { CanvasElement, HistoryEntry, KonvaData, ToolType } from '@/types/canvas'

interface CanvasStore {
  activeTool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
  elements: CanvasElement[]
  selectedId: string | null
  history: HistoryEntry[]
  historyIndex: number

  setTool: (tool: ToolType) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setSelectedId: (id: string | null) => void
  addElement: (el: CanvasElement) => void
  updateElement: (elementId: string, data: Partial<KonvaData>) => void
  deleteElement: (elementId: string) => void
  setElements: (elements: CanvasElement[]) => void
  undo: () => void
  redo: () => void
}

function snapshot(
  currentHistory: HistoryEntry[],
  currentIndex: number,
  newElements: CanvasElement[]
): Pick<CanvasStore, 'history' | 'historyIndex' | 'elements'> {
  const entry: HistoryEntry = { elements: [...newElements], timestamp: Date.now() }
  const trimmed = currentHistory.slice(0, currentIndex + 1)
  const history = [...trimmed, entry].slice(-50)
  return { elements: newElements, history, historyIndex: history.length - 1 }
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  activeTool: 'pen',
  strokeColor: '#6C63FF',
  fillColor: 'transparent',
  strokeWidth: 2,
  elements: [],
  selectedId: null,
  history: [],
  historyIndex: -1,

  setTool: (tool) => set({ activeTool: tool, selectedId: null }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setSelectedId: (selectedId) => set({ selectedId }),

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
    set((state) => {
      const newElements = state.elements.filter((el) => el.elementId !== elementId)
      return {
        ...snapshot(state.history, state.historyIndex, newElements),
        selectedId: state.selectedId === elementId ? null : state.selectedId,
      }
    }),

  setElements: (elements) => set({ elements }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state
      const newIndex = state.historyIndex - 1
      const elements = newIndex < 0 ? [] : state.history[newIndex].elements
      return { historyIndex: newIndex, elements, selectedId: null }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return { historyIndex: newIndex, elements: state.history[newIndex].elements }
    }),
}))

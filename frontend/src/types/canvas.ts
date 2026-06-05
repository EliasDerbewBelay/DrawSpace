export type ToolType =
  | 'select'
  | 'pen'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'sticky'
  | 'eraser'

export interface KonvaData {
  x?: number
  y?: number
  width?: number
  height?: number
  points?: number[]
  text?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  fontSize?: number
  rotation?: number
  opacity?: number
}

export interface CanvasElement {
  elementId: string
  type: ToolType
  data: KonvaData
  createdBy: string
  updatedAt: number
}

export interface HistoryEntry {
  elements: CanvasElement[]
  timestamp: number
}

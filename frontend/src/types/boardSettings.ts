export type CanvasBackgroundPreset = 'theme' | '#ffffff' | '#f4f4f8' | '#0F1117' | '#1a1d26' | 'custom'

export interface BoardSettings {
  showGrid: boolean
  canvasBackground: CanvasBackgroundPreset
  customBackgroundColor?: string
  defaultStrokeColor: string
  defaultFillColor: string
  defaultStrokeWidth: number
}

export const DEFAULT_BOARD_SETTINGS: BoardSettings = {
  showGrid: true,
  canvasBackground: 'theme',
  defaultStrokeColor: '#6C63FF',
  defaultFillColor: 'transparent',
  defaultStrokeWidth: 2,
}

export function normalizeBoardSettings(raw: unknown): BoardSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BOARD_SETTINGS }
  const s = raw as Partial<BoardSettings>
  return {
    showGrid: typeof s.showGrid === 'boolean' ? s.showGrid : DEFAULT_BOARD_SETTINGS.showGrid,
    canvasBackground:
      s.canvasBackground && typeof s.canvasBackground === 'string'
        ? (s.canvasBackground as CanvasBackgroundPreset)
        : DEFAULT_BOARD_SETTINGS.canvasBackground,
    customBackgroundColor:
      typeof s.customBackgroundColor === 'string' ? s.customBackgroundColor : undefined,
    defaultStrokeColor:
      typeof s.defaultStrokeColor === 'string'
        ? s.defaultStrokeColor
        : DEFAULT_BOARD_SETTINGS.defaultStrokeColor,
    defaultFillColor:
      typeof s.defaultFillColor === 'string'
        ? s.defaultFillColor
        : DEFAULT_BOARD_SETTINGS.defaultFillColor,
    defaultStrokeWidth:
      typeof s.defaultStrokeWidth === 'number'
        ? s.defaultStrokeWidth
        : DEFAULT_BOARD_SETTINGS.defaultStrokeWidth,
  }
}

export function resolveCanvasBackgroundColor(settings: BoardSettings): string | null {
  if (settings.canvasBackground === 'theme') return null
  if (settings.canvasBackground === 'custom') {
    return settings.customBackgroundColor ?? null
  }
  return settings.canvasBackground
}

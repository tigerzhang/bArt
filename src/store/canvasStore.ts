import create from 'zustand'

export type Layer = {
  id: string
  type: 'image' | 'rect' | 'text'
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
  src?: string
  name?: string
  visible?: boolean
  locked?: boolean
}

export type CanvasState = {
  layers: Layer[]
  selectedId: string | null
  zoom: number
  pan: { x: number; y: number }
  isDragging?: boolean
  layersPanelOpen?: boolean
  rightPanelOpen?: boolean
  addLayer: (layer: Layer) => void
  selectLayer: (id: string | null) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  renameLayer: (id: string, name: string) => void
  moveLayer: (id: string, to: number) => void
  removeLayer: (id: string) => void
  toggleLayersPanel?: () => void
  toggleRightPanel?: () => void
  setZoom: (z: number) => void
  setPan: (p: { x: number; y: number }) => void
  canvasSize?: { width: number; height: number }
  setCanvasSize?: (size: { width: number; height: number }) => void
  // No left panel in this layout; toolbar actions live in `FloatingToolbar`
  // tooling: track the active tool; default to 'select'
  activeTool?: 'select' | 'hand'
  setActiveTool?: (t: 'select' | 'hand') => void
  setIsDragging?: (value: boolean) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  layers: [
    {
      id: 'sample-1',
      type: 'image',
      x: 140,
      y: 120,
      width: 480,
      height: 320,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      src: '/assets/sample.svg',
      name: 'Sample Image',
      visible: true,
        // Removed accidental canvasSize entry
    },
  ],
  selectedId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  layersPanelOpen: false,
  rightPanelOpen: true,
  addLayer: (layer) =>
    set((s) => ({ layers: [...s.layers, { ...layer, visible: true, locked: false }], selectedId: layer.id })),
  selectLayer: (id) => set(() => ({ selectedId: id })),
  updateLayer: (id, patch) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) })),
  toggleLayerLock: (id) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)) })),
  renameLayer: (id, name) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)) })),
  moveLayer: (id, to) =>
    set((s) => {
      const from = s.layers.findIndex((l) => l.id === id)
      if (from === -1) return {}
      const copy = s.layers.slice()
      const [item] = copy.splice(from, 1)
      copy.splice(Math.max(0, Math.min(to, copy.length)), 0, item)
      return { layers: copy }
    }),
  removeLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),
  toggleLayersPanel: () => set((s) => ({ layersPanelOpen: !s.layersPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setZoom: (z) => set({ zoom: z }),
  setPan: (p) => set({ pan: p }),
  setCanvasSize: (size) => set({ canvasSize: size }),
  // default tool is select
  activeTool: 'select',
  setActiveTool: (t) => set({ activeTool: t }),
  setIsDragging: (value) => set({ isDragging: value }),
  // toggleLeftPanel removed
}))

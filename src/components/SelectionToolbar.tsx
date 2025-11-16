import React from 'react'
import { Layer as LayerType, useCanvasStore } from '../store/canvasStore'

type Props = {
  layer: LayerType | null
  left?: number
  top?: number
  disablePointer?: boolean
}

export default function SelectionToolbar({ layer, left = 0, top = 0, disablePointer = false }: Props) {
  const select = useCanvasStore((s) => s.selectLayer)
  const update = useCanvasStore((s) => s.updateLayer)
  const remove = useCanvasStore((s) => s.removeLayer)

  if (!layer) return null

  return (
    <div className="selection-toolbar drag-guard-target" style={{ position: 'fixed', left, top, zIndex: 120, pointerEvents: disablePointer ? 'none' : 'auto' }}>
      <div className="selection-card">
        <span style={{ fontWeight: 600 }}>{layer.name || 'Item'}</span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
          <button title="Delete" onClick={() => { remove(layer.id) }}>🗑</button>
          <button title="Lock/Unlock" onClick={() => update(layer.id, { locked: !layer.locked })}>{layer.locked ? '🔒' : '🔓'}</button>
          <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 12 }}>Hold selected item and drag to move</span>
        </div>
      </div>
    </div>
  )
}

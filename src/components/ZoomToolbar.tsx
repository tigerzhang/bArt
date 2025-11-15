import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function ZoomToolbar() {
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)

  const onZoomIn = () => setZoom(Math.min(zoom * 1.2, 20))
  const onZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1))

  return (
    <div className="zoom-toolbar" role="toolbar" aria-label="Zoom controls">
      <button className="toolbar-button" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>➕</button>
      <div className="zoom-display">{Math.round(zoom * 100)}%</div>
      <button className="toolbar-button" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>➖</button>
    </div>
  )
}

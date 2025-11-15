import React, { useState } from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'
import ZoomMenu from './ZoomMenu'
// useState imported above

export default function ZoomToolbar() {
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)

  const onZoomIn = () => setZoom(Math.min(zoom * 1.2, 20))
  const onZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1))
  const [open, setOpen] = useState(false)
  const menuId = 'zoom-menu'

  return (
    <div className="zoom-toolbar" role="toolbar" aria-label="Zoom controls">
      <button className="toolbar-button" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>➕</button>
      <button id={menuId + '-trigger'} aria-controls={menuId} aria-haspopup="menu" aria-expanded={open} className="zoom-display" onClick={() => setOpen((prev) => !prev)} style={{ cursor: 'pointer' }}>{Math.round(zoom * 100)}%</button>
      <button className="toolbar-button" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>➖</button>
      {open && <ZoomMenu onClose={() => setOpen(false)} id={menuId} labelledBy={menuId + '-trigger'} />}
    </div>
  )
}

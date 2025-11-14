import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function TopBar() {
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)

  return (
    <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 16, zIndex: 30, background: 'rgba(255,255,255,0.96)', padding: 8, borderRadius: 8 }}>
      <button onClick={() => setZoom(Math.min(zoom * 1.2, 20))}>Zoom in</button>
      <button onClick={() => setZoom(Math.max(zoom / 1.2, 0.1))}>Zoom out</button>
      <button onClick={() => setZoom(1)}>Reset</button>
    </div>
  )
}

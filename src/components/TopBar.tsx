import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function TopBar() {
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)
  const setPan = useCanvasStore((s: CanvasState) => s.setPan)
  const layers = useCanvasStore((s: CanvasState) => s.layers)
  const canvasSize = useCanvasStore((s: CanvasState) => s.canvasSize)

  const onFitViewport = () => {
    const vp = canvasSize || { width: window.innerWidth, height: window.innerHeight }
    if (!layers || layers.length === 0) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const l of layers) {
      if (l.visible === false) continue
      const w = l.width ?? 0
      const h = l.height ?? 0
      minX = Math.min(minX, l.x)
      minY = Math.min(minY, l.y)
      maxX = Math.max(maxX, l.x + w)
      maxY = Math.max(maxY, l.y + h)
    }
    if (minX === Infinity) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const contentW = Math.max(1, maxX - minX)
    const contentH = Math.max(1, maxY - minY)
    const margin = 48
    const scaleX = (vp.width - margin * 2) / contentW
    const scaleY = (vp.height - margin * 2) / contentH
    const fitScale = Math.max(0.1, Math.min(20, Math.min(scaleX, scaleY)))
    // compute pan to center content
    const panX = -minX * fitScale + (vp.width - contentW * fitScale) / 2
    const panY = -minY * fitScale + (vp.height - contentH * fitScale) / 2
    setZoom(fitScale)
    setPan({ x: panX, y: panY })
  }

  return (
    <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 16, zIndex: 30, background: 'rgba(255,255,255,0.96)', padding: 8, borderRadius: 8 }}>
      <button onClick={() => setZoom(1)}>Reset</button>
      <button onClick={onFitViewport}>Fit viewport</button>
    </div>
  )
}

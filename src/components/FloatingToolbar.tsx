import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function FloatingToolbar() {
  const addLayer = useCanvasStore((s: CanvasState) => s.addLayer)
  const toggleLayersPanel = useCanvasStore((s: CanvasState) => s.toggleLayersPanel)
  const layersOpen = useCanvasStore((s: CanvasState) => s.layersPanelOpen)

  const onAddImage = async () => {
    const id = Date.now().toString()
    // in a real app, open file dialog or asset panel. Here we use a sample image path
    addLayer({
      id,
      type: 'image',
      x: 100,
      y: 100,
      width: 300,
      height: 200,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      src: '/assets/sample.svg',
      name: 'Image ' + id,
    })
  }

  const onAddRect = () => {
    const id = Date.now().toString()
    addLayer({ id, type: 'rect', x: 200, y: 200, width: 240, height: 140, name: 'Rect ' + id })
  }

  return (
    <div className="floating-toolbar">
      <button onClick={onAddImage} title="Add image">📷</button>
      <button onClick={onAddRect} title="Add rectangle">▭</button>
      <button title="Zoom in">➕</button>
      <button title="Zoom out">➖</button>
      <button onClick={() => toggleLayersPanel && toggleLayersPanel()} title="Toggle layers" aria-pressed={!!layersOpen}>🗂</button>
    </div>
  )
}

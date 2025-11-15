import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function FloatingToolbar() {
  const addLayer = useCanvasStore((s: CanvasState) => s.addLayer)
  // layers are toggled from the bottom-left overlay now

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
      <button className="toolbar-button" onClick={onAddImage} title="Add image">📷</button>
      <button className="toolbar-button" onClick={onAddRect} title="Add rectangle">▭</button>
      {/* Zoom controls moved to left-bottom overlay next to layer toggle */}
      {/* Layers button moved to left-bottom toggle; keep FloatingToolbar compact */}
    </div>
  )
}

import React, { useEffect } from 'react'
import CanvasSurface from './components/CanvasSurface'
import FloatingToolbar from './components/FloatingToolbar'
import RightPanel from './components/RightPanel'
import LayersPanel from './components/LayersPanel'
import { useCanvasStore, CanvasState } from './store/canvasStore'
import TopBar from './components/TopBar'

export default function App() {
  const toggleLayersPanel = useCanvasStore((s: CanvasState) => s.toggleLayersPanel)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleLayersPanel && toggleLayersPanel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleLayersPanel])
  return (
    <div className="app-root">
      <FloatingToolbar />
      <TopBar />
      <CanvasSurface />
      <RightPanel />
      <LayersPanel />
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../store/canvasStore'

export default function ToolSelector() {
  const activeTool = useCanvasStore((s) => s.activeTool)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggleOpen = () => setOpen((v) => !v)

  return (
    <div className="bottom-center-toolbar" ref={ref} style={{ zIndex: 50 }}>
      <button className="tool-button" aria-haspopup="true" aria-expanded={open} onClick={toggleOpen} title="Tool selector">
        {activeTool === 'select' ? '▸' : '✋'}
      </button>
      {open && (
        <div className="tool-menu" role="menu" aria-label="Tool menu">
          <ul>
            <li role="menuitem" onClick={() => { setActiveTool && setActiveTool('select'); setOpen(false) }}>
              <span>Select</span>
              <span className="key">{activeTool === 'select' ? '✓' : ''}</span>
            </li>
            <li role="menuitem" onClick={() => { setActiveTool && setActiveTool('hand'); setOpen(false) }}>
              <span>Hand tool</span>
              <span className="key">{activeTool === 'hand' ? '✓' : ''}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

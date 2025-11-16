import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
  const renderToolIcon = useCallback((tool: 'select' | 'hand', size: number = 24) => {
    if (tool === 'hand') {
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6.7 11.4V6.4a1.2 1.2 0 1 1 2.4 0v2.4" />
          <path d="M9.1 8.8V5.6a1.2 1.2 0 1 1 2.4 0v3.3" />
          <path d="M11.5 9V6a1.2 1.2 0 1 1 2.4 0v3" />
          <path d="M13.9 9.2V7a1.2 1.2 0 1 1 2.4 0v6.4c0 1.1-.5 2.1-1.4 2.8l-1.6 1.2a3 3 0 0 1-1.8.6h-1.4a3 3 0 0 1-2.9-2.2l-.8-2.9c-.3-1 .6-1.9 1.6-1.5l1.3.5" />
        </svg>
      )
    }

    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M5.6 4.1 14.6 13.1l-4.5.6 1.6 4.7-1.8.7-1.6-4.6-2.8 2.6Z" />
      </svg>
    )
  }, [])

  const tools = useMemo(
    () => [
      { id: 'select' as const, label: 'Select', icon: renderToolIcon('select', 20) },
      { id: 'hand' as const, label: 'Hand', icon: renderToolIcon('hand', 20) },
    ],
    [renderToolIcon]
  )

  const currentLabel = tools.find((item) => item.id === activeTool)?.label ?? 'Select'

  const handleChoose = (tool: 'select' | 'hand') => {
    if (!setActiveTool) return
    setActiveTool(tool)
    setOpen(false)
  }

  return (
    <div className="bottom-center-toolbar" ref={ref} style={{ zIndex: 50 }}>
      <div className="tool-display" aria-live="polite" aria-atomic="true">
        <span className="tool-display-icon">{renderToolIcon((activeTool ?? 'select') as 'select' | 'hand')}</span>
        <span className="sr-only">{currentLabel} tool selected</span>
      </div>
      <button
        type="button"
        className="tool-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="tool-selector-menu"
        onClick={toggleOpen}
        title="Toggle tool menu"
      >
        <span className="tool-toggle-icon" aria-hidden="true">
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" focusable="false">
              <path d="M4 12.5 10 6.5l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" focusable="false">
              <path d="M4 7.5 10 13.5l6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="sr-only">{open ? 'Hide tool menu' : 'Show tool menu'}</span>
      </button>
      {open && (
        <div className="tool-menu" role="menu" id="tool-selector-menu" aria-label="Tool menu">
          <ul>
            {tools.map((tool) => (
              <li key={tool.id} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={activeTool === tool.id}
                  onClick={() => handleChoose(tool.id)}
                >
                  <span className="tool-menu-icon" aria-hidden="true">{tool.icon}</span>
                  <span>{tool.label}</span>
                  <span className="key">{activeTool === tool.id ? '✓' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

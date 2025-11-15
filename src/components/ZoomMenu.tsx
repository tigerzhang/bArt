import React, { useEffect, useRef } from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function ZoomMenu({ onClose, id, labelledBy }: { onClose?: () => void; id?: string; labelledBy?: string }) {
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)
  const setPan = useCanvasStore((s: CanvasState) => s.setPan)
  const layers = useCanvasStore((s: CanvasState) => s.layers)
  const canvasSize = useCanvasStore((s: CanvasState) => s.canvasSize)

  const ref = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = React.useState(0)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return
      const target = e.target as Node
      // Ignore clicks inside the menu itself
      if (ref.current.contains(target)) return

      // Also ignore clicks on the trigger element (labelledBy control)
      if (labelledBy) {
        const trigger = document.getElementById(labelledBy)
        if (trigger && trigger.contains(target)) return
      }

      // otherwise treat as outside click and close
      onClose && onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose, labelledBy])

  // focus first item initially for keyboard navigation
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const first = el.querySelector('li') as HTMLElement | null
    first?.focus()
    setSelected(0)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose && onClose()
      }
      if (e.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        e.preventDefault()
      }
      if (e.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length)
        e.preventDefault()
      }
      if (e.key === 'Enter') {
        // simulate click on selected item
        const item = items[selected]
        if (item) item.onClick()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, selected])

  const stepZoomIn = () => setZoom(Math.min(zoom * 1.2, 20))
  const stepZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1))

  const fitViewport = () => {
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
    const panX = -minX * fitScale + (vp.width - contentW * fitScale) / 2
    const panY = -minY * fitScale + (vp.height - contentH * fitScale) / 2
    setZoom(fitScale)
    setPan({ x: panX, y: panY })
  }

  const setTo = (value: number) => setZoom(value)

  const items = [
    { label: 'Zoom in', hint: '⌘ +', onClick: stepZoomIn },
    { label: 'Zoom out', hint: '⌘ -', onClick: stepZoomOut },
    { label: 'Fit to Screen', hint: '⇧ 1', onClick: fitViewport },
    { label: 'Zoom to 50%', hint: '', onClick: () => setTo(0.5) },
    { label: 'Zoom to 100%', hint: '', onClick: () => setTo(1) },
    { label: 'Zoom to 200%', hint: '', onClick: () => setTo(2) },
  ]

  return (
    <div id={id} className="zoom-menu" ref={ref} role="menu" aria-label="Zoom menu" aria-labelledby={labelledBy}>
      <ul>
        {items.map((it, i) => (
          <li key={i} role="menuitem" tabIndex={-1} onClick={() => { it.onClick(); onClose && onClose() }} aria-selected={selected === i} style={{ background: selected === i ? 'rgba(0,0,0,0.04)' : 'transparent' }}>
            <span>{it.label}</span>
            {it.hint && <span className="key">{it.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

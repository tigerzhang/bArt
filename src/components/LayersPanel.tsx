import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function LayersPanel() {
  const layers = useCanvasStore((s: CanvasState) => s.layers)
  const select = useCanvasStore((s: CanvasState) => s.selectLayer)
  const selectedId = useCanvasStore((s: CanvasState) => s.selectedId)
  // Left panel removed from the default layout; this component is preserved
  // for future use (dock/overlay variants) and is not rendered by default.
  const toggleVisibility = useCanvasStore((s: CanvasState) => s.toggleLayerVisibility)
  const toggleLock = useCanvasStore((s: CanvasState) => s.toggleLayerLock)
  const renameLayer = useCanvasStore((s: CanvasState) => s.renameLayer)
  const moveLayer = useCanvasStore((s: CanvasState) => s.moveLayer)
  const open = useCanvasStore((s: CanvasState) => s.layersPanelOpen)
  const close = useCanvasStore((s: CanvasState) => s.toggleLayersPanel)

  const [exiting, setExiting] = React.useState(false)
  const ref = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open) setExiting(false)
  }, [open])

  if (!open && !exiting) return null
  // TODO: animate mount/unmount with CSS classes for fold/unfold

  return (
    <aside ref={ref} id="layers-panel" className={`layers-panel ${exiting ? 'exit' : 'enter'}`} role="navigation" aria-label="Layers panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Layers</h4>
        <div>
          <button
            className="fold-button"
            title="Fold to toggle"
            aria-label="Fold layers to toggle"
            onClick={() => {
              setExiting(true)
              const el = ref.current
              if (!el) {
                // fallback
                setTimeout(() => close && close(), 260)
                return
              }
              const onEnd = (e: TransitionEvent) => {
                if (e.propertyName && e.propertyName.includes('transform')) {
                  el.removeEventListener('transitionend', onEnd)
                  close && close()
                }
              }
              el.addEventListener('transitionend', onEnd)
            }}
          >▾</button>
        </div>
      </div>
      <ul>
        {layers.slice().reverse().map((l, i) => (
          <li
            key={l.id}
            className={l.id === selectedId ? 'selected' : ''}
            aria-current={l.id === selectedId}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => toggleVisibility(l.id)} aria-pressed={!l.visible} aria-label={l.visible ? 'Hide layer' : 'Show layer'}>
                  {l.visible ? '👁️' : '🚫'}
                </button>
                <button onClick={() => toggleLock(l.id)} aria-pressed={!!l.locked} aria-label={l.locked ? 'Unlock layer' : 'Lock layer'}>
                  {l.locked ? '🔒' : '🔓'}
                </button>
                <div onClick={() => select(l.id)} style={{ cursor: 'pointer' }}>
                  {l.name || l.id}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button title="Rename" onClick={() => {
                  const name = prompt('Rename layer', l.name || '')
                  if (typeof name === 'string' && name !== l.name) renameLayer(l.id, name)
                }}>
                  ✏️
                </button>
                <button title="Move up" onClick={() => moveLayer(l.id, layers.length - 1 - i - 1)} aria-label="Move layer up">▲</button>
                <button title="Move down" onClick={() => moveLayer(l.id, layers.length - 1 - i + 1)} aria-label="Move layer down">▼</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )

  return (
    <div className="layers-panel">
      <h4>Layers</h4>
      <ul>
        {layers.slice().reverse().map((l) => (
          <li key={l.id} className={l.id === selectedId ? 'selected' : ''} onClick={() => select(l.id)}>
            {l.name || l.id} <span className="layer-type">{l.type}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

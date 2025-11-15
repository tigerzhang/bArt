import React from 'react'
import { useCanvasStore, CanvasState } from '../store/canvasStore'

export default function RightPanel() {
  const open = useCanvasStore((s: CanvasState) => s.rightPanelOpen)
  const toggle = useCanvasStore((s: CanvasState) => s.toggleRightPanel)

  const [exiting, setExiting] = React.useState(false)

  React.useEffect(() => {
    if (!open) setExiting(false)
  }, [open])

  if (!open && !exiting) return null

  // Add a small unmount delay so we can animate folding back to the toggle.
  // We'll add an `exit` state when the user clicks fold; the panel will remain in the DOM for
  // 240ms (matching CSS transition) and then will be removed. For simplicity here we'll just
  // show 'enter' class on mount — a later refactor can make this a full mount/unmount transition.

  return (
    <div id="right-panel" className={`right-panel ${exiting ? 'exit' : 'enter'}`} role="complementary" aria-label="Right panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Templates</h4>
        <button className="fold-button" aria-label="Fold right panel" onClick={() => { setExiting(true); setTimeout(() => toggle && toggle(), 240) }}>▾</button>
      </div>
      <div className="user-greeting">Hi, Designer 👋</div>
      <div className="templates">
        <div className="template-card">Wine List — Template</div>
        <div className="template-card">Coffee Shop — Template</div>
        <div className="template-card">Story Board — Template</div>
      </div>
    </div>
  )
}

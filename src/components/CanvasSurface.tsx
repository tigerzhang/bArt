import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Text } from 'react-konva'
import ZoomToolbar from './ZoomToolbar'
import ToolSelector from './ToolSelector'
import SelectionToolbar from './SelectionToolbar'
import { useCanvasStore, Layer, CanvasState } from '../store/canvasStore'
// no secondary React import

const dragGuardPointerCache = new Map<HTMLElement, string>()
let dragGuardDepth = 0
let previousBodyUserSelect: string | null = null
let previousBodyCursor: string | null = null

type ManualDragSession = {
  node: any
  stage: any
  layerId: string
  pointerId: number
  offset: { x: number; y: number }
  updateLayer?: CanvasState['updateLayer']
}

let activeManualDrag: ManualDragSession | null = null

function endManualDragSession(evt?: PointerEvent) {
  if (!activeManualDrag) return
  const session = activeManualDrag
  activeManualDrag = null
  window.removeEventListener('pointermove', handleManualDragMove, true)
  window.removeEventListener('pointerup', handleManualDragEnd, true)
  window.removeEventListener('pointercancel', handleManualDragEnd, true)

  if (evt) {
    session.stage.setPointersPositions(evt)
  }
  const pointer = session.stage.getPointerPosition()
  if (pointer) {
    const nextX = pointer.x - session.offset.x
    const nextY = pointer.y - session.offset.y
    session.node.position({ x: nextX, y: nextY })
  }

  session.node.getLayer()?.batchDraw()
  session.updateLayer?.(session.layerId, { x: session.node.x(), y: session.node.y() })
  const activeTool = useCanvasStore.getState().activeTool
  const stageContainer = session.stage?.container?.()
  if (stageContainer) {
    stageContainer.style.cursor = activeTool === 'hand' ? 'grab' : 'default'
  }
  setDragInteractionBlocked(false)
}

function handleManualDragMove(evt: PointerEvent) {
  if (!activeManualDrag || evt.pointerId !== activeManualDrag.pointerId) return
  if (evt.cancelable) evt.preventDefault()
  const { stage, node, offset } = activeManualDrag
  stage.setPointersPositions(evt)
  const pointer = stage.getPointerPosition()
  if (!pointer) return
  const nextX = pointer.x - offset.x
  const nextY = pointer.y - offset.y
  node.position({ x: nextX, y: nextY })
  node.getLayer()?.batchDraw()
}

function handleManualDragEnd(evt: PointerEvent) {
  if (!activeManualDrag || evt.pointerId !== activeManualDrag.pointerId) return
  if (evt.cancelable) evt.preventDefault()
  endManualDragSession(evt)
}

function beginManualDragSession(session: ManualDragSession) {
  if (activeManualDrag) {
    endManualDragSession()
  }
  activeManualDrag = session
  window.addEventListener('pointermove', handleManualDragMove, true)
  window.addEventListener('pointerup', handleManualDragEnd, true)
  window.addEventListener('pointercancel', handleManualDragEnd, true)
}

function setDragInteractionBlocked(block: boolean) {
  if (typeof document === 'undefined') return
  if (block) {
    dragGuardDepth += 1
    if (dragGuardDepth > 1) return
    const targets = document.querySelectorAll<HTMLElement>('.drag-guard-target')
    targets.forEach((el) => {
      if (!dragGuardPointerCache.has(el)) {
        dragGuardPointerCache.set(el, el.style.pointerEvents)
      }
      el.style.pointerEvents = 'none'
      el.classList.add('drag-guard-disabled')
    })
    if (previousBodyUserSelect === null) {
      previousBodyUserSelect = document.body.style.userSelect
    }
    document.body.style.userSelect = 'none'
    if (previousBodyCursor === null) {
      previousBodyCursor = document.body.style.cursor
    }
    document.body.classList.add('drag-guard-active')
    document.body.style.cursor = 'grabbing'
    return
  }

  if (dragGuardDepth === 0) return
  dragGuardDepth -= 1
  if (dragGuardDepth > 0) return

  dragGuardPointerCache.forEach((pointerEvents, el) => {
    if (el.isConnected) {
      el.style.pointerEvents = pointerEvents || ''
      el.classList.remove('drag-guard-disabled')
    }
  })
  dragGuardPointerCache.clear()

  document.body.classList.remove('drag-guard-active')
  if (previousBodyUserSelect !== null) {
    document.body.style.userSelect = previousBodyUserSelect
    previousBodyUserSelect = null
  } else {
    document.body.style.removeProperty('user-select')
  }
  if (previousBodyCursor !== null) {
    document.body.style.cursor = previousBodyCursor
    previousBodyCursor = null
  } else {
    document.body.style.removeProperty('cursor')
  }
}

// lightweight image loader hook so we don't need `use-image` dependency
function useLoadedImage(src?: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!src) return setImg(null)
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = src
    image.onload = () => setImg(image)
    image.onerror = () => setImg(null)
    return () => {
      // allow GC
      // @ts-ignore
      image.onload = null
      // @ts-ignore
      image.onerror = null
    }
  }, [src])
  return img
}

const KonvaImageLayer = React.memo(({ layer }: { layer: Layer }) => {
  const img = useLoadedImage(layer.src)
  const nodeRef = useRef<any>(null)
  const selectLayerRef = useRef(useCanvasStore.getState().selectLayer)
  const updateLayerRef = useRef(useCanvasStore.getState().updateLayer)
  const activeToolRef = useRef(useCanvasStore.getState().activeTool)

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((state) => {
      activeToolRef.current = state.activeTool
      selectLayerRef.current = state.selectLayer
      updateLayerRef.current = state.updateLayer
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const handlePointerDown = (evt: any) => {
      const state = useCanvasStore.getState()
      if (state.activeTool !== 'select' || layer.locked) return
      const pointerEvent: PointerEvent | undefined = evt?.evt
      if (!pointerEvent) return
      if (pointerEvent.button !== undefined && pointerEvent.button !== 0 && pointerEvent.pointerType !== 'touch') {
        return
      }
      evt.cancelBubble = true
      if (pointerEvent.cancelable) pointerEvent.preventDefault()
      const stage = node.getStage()
      if (!stage) return
      selectLayerRef.current?.(layer.id)
      node.moveToTop()
      stage.setPointersPositions(pointerEvent)
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      setDragInteractionBlocked(true)
      const container = stage.container()
      if (container) container.style.cursor = 'grabbing'
      beginManualDragSession({
        node,
        stage,
        layerId: layer.id,
        pointerId: pointerEvent.pointerId ?? 0,
        offset: { x: pointer.x - node.x(), y: pointer.y - node.y() },
        updateLayer: updateLayerRef.current,
      })
    }
    node.on('pointerdown', handlePointerDown)
    return () => {
      node.off('pointerdown', handlePointerDown)
      if (activeManualDrag && activeManualDrag.node === node) {
        endManualDragSession()
      }
    }
  }, [layer.id, layer.locked])

  return (
    <KonvaImage
      image={img ?? undefined}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      ref={nodeRef}
      perfectDrawEnabled={false}
      transformsEnabled="position"
      onClick={() => activeToolRef.current === 'select' && selectLayerRef.current?.(layer.id)}
      onTap={() => activeToolRef.current === 'select' && selectLayerRef.current?.(layer.id)}
      onMouseEnter={(e: any) => {
        const stage = e.target.getStage()
        if (!stage) return
        stage.container().style.cursor = activeToolRef.current === 'hand' ? 'grab' : 'default'
      }}
      onMouseLeave={(e: any) => {
        const stage = e.target.getStage()
        if (!stage) return
        stage.container().style.cursor = activeToolRef.current === 'hand' ? 'grab' : 'default'
      }}
    />
  )
}, (prev, next) => {
  return (
    prev.layer.id === next.layer.id &&
    prev.layer.src === next.layer.src &&
    prev.layer.x === next.layer.x &&
    prev.layer.y === next.layer.y &&
    prev.layer.width === next.layer.width &&
    prev.layer.height === next.layer.height &&
    prev.layer.rotation === next.layer.rotation &&
    prev.layer.locked === next.layer.locked
  )
})

const KonvaRectLayer = React.memo(({ layer }: { layer: Layer }) => {
  const rectRef = useRef<any>(null)
  const selectLayerRef = useRef(useCanvasStore.getState().selectLayer)
  const updateLayerRef = useRef(useCanvasStore.getState().updateLayer)
  const activeToolRef = useRef(useCanvasStore.getState().activeTool)

  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((state) => {
      activeToolRef.current = state.activeTool
      selectLayerRef.current = state.selectLayer
      updateLayerRef.current = state.updateLayer
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const node = rectRef.current
    if (!node) return
    const handlePointerDown = (evt: any) => {
      const state = useCanvasStore.getState()
      if (state.activeTool !== 'select' || layer.locked) return
      const pointerEvent: PointerEvent | undefined = evt?.evt
      if (!pointerEvent) return
      if (pointerEvent.button !== undefined && pointerEvent.button !== 0 && pointerEvent.pointerType !== 'touch') {
        return
      }
      evt.cancelBubble = true
      if (pointerEvent.cancelable) pointerEvent.preventDefault()
      const stage = node.getStage()
      if (!stage) return
      selectLayerRef.current?.(layer.id)
      node.moveToTop()
      stage.setPointersPositions(pointerEvent)
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      setDragInteractionBlocked(true)
      const container = stage.container()
      if (container) container.style.cursor = 'grabbing'
      beginManualDragSession({
        node,
        stage,
        layerId: layer.id,
        pointerId: pointerEvent.pointerId ?? 0,
        offset: { x: pointer.x - node.x(), y: pointer.y - node.y() },
        updateLayer: updateLayerRef.current,
      })
    }
    node.on('pointerdown', handlePointerDown)
    return () => {
      node.off('pointerdown', handlePointerDown)
      if (activeManualDrag && activeManualDrag.node === node) {
        endManualDragSession()
      }
    }
  }, [layer.id, layer.locked])

  return (
    <Rect
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fill="#fff"
      stroke="#cfcfcf"
      strokeWidth={2}
      ref={rectRef}
      perfectDrawEnabled={false}
      transformsEnabled="position"
      onClick={() => activeToolRef.current === 'select' && selectLayerRef.current?.(layer.id)}
      onTap={() => activeToolRef.current === 'select' && selectLayerRef.current?.(layer.id)}
    />
  )
}, (prev, next) => {
  return (
    prev.layer.id === next.layer.id &&
    prev.layer.x === next.layer.x &&
    prev.layer.y === next.layer.y &&
    prev.layer.width === next.layer.width &&
    prev.layer.height === next.layer.height &&
    prev.layer.locked === next.layer.locked
  )
})

export default function CanvasSurface() {
  const layers = useCanvasStore((s: CanvasState) => s.layers)
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const pan = useCanvasStore((s: CanvasState) => s.pan)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)
  const setPan = useCanvasStore((s: CanvasState) => s.setPan)
  const activeTool = useCanvasStore((s: CanvasState) => s.activeTool)
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<any>(null)

  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
      
  // publish canvas (stage) size to store so other components can compute fit/zoom
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize)
  useEffect(() => {
    setCanvasSize && setCanvasSize(stageSize)
  }, [stageSize.width, stageSize.height])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.scale({ x: zoom, y: zoom })
    // center stage position on zoom change (keep current pan)
    stage.position(pan)
    stage.batchDraw && stage.batchDraw()
  }, [zoom, pan])

  // Update cursor based on active tool
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const cursor = activeTool === 'hand' ? 'grab' : 'default'
    try {
      stage.container().style.cursor = cursor
    } catch (err) {
      // ignore
    }
  }, [activeTool])

  const onWheel = (e: any) => {
    e.evt.preventDefault()
    const scaleBy = 1.06
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    }

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    setZoom(newScale)

    const newPos = {
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
    }
    stage.scale({ x: newScale, y: newScale })
    stage.position(newPos)
    setPan(newPos)
  }

  const onDragMove = (e: any) => {
    setPan({ x: e.target.x(), y: e.target.y() })
  }

  const onStageDragStart = (e: any) => {
    const stage = stageRef.current
    if (!stage) return
    if (activeTool === 'hand') {
      setDragInteractionBlocked(true)
      try {
        stage.container().style.cursor = 'grabbing'
      } catch (err) {}
    }
  }
  const onStageDragEnd = (e: any) => {
    const stage = stageRef.current
    if (!stage) return
    if (activeTool === 'hand') {
      try {
        stage.container().style.cursor = 'grab'
      } catch (err) {}
      setDragInteractionBlocked(false)
    }
    setPan({ x: e.target.x(), y: e.target.y() })
  }

  return (
    <div className="canvas-surface" style={{ width: '100%', height: '100%' }}>
      {/* Left bottom layout/layers toggle — moved from toolbar to a dedicated location */}
      <div className="bottom-left-toolbar drag-guard-target" style={{ left: 'var(--panel-left-offset)', bottom: 'var(--panel-bottom-offset)' }}>
        <div className="panel-toggle">
          <button aria-controls="layers-panel" aria-expanded={!!useCanvasStore.getState().layersPanelOpen} aria-label="Toggle Layers" onClick={() => {
            const fn = useCanvasStore.getState().toggleLayersPanel
            if (!fn) return
            // make it open immediately — LayersPanel handles exit animation
            fn()
          }}>
            🗂
          </button>
        </div>
        {/* zoom toolbar lives in its own component so it can be shared */}
        <div style={{ marginLeft: 8 }}>
          {/* import ZoomToolbar inline to keep bottom-left layout tidy */}
          <ZoomToolbar />
        </div>
      </div>
      {/* top-right toolbar with RightPanel toggle */}
      <div className="top-right-toolbar drag-guard-target" style={{ right: 'var(--panel-top-right-offset)', top: 'var(--panel-top-offset)', position: 'fixed', zIndex: 40 }}>
        <div className="panel-toggle">
          <button aria-controls="right-panel" aria-label="Toggle Right Panel" aria-expanded={!!useCanvasStore.getState().rightPanelOpen} onClick={() => useCanvasStore.getState().toggleRightPanel?.()}>📂</button>
        </div>
      </div>
      {/* left panel removed; toggle hidden */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable={activeTool === 'hand'}
        onDragStart={onStageDragStart}
        onDragEnd={onStageDragEnd}
        onWheel={onWheel}
        onDragMove={onDragMove}
        onMouseDown={(e: any) => {
          // if clicked on stage not on any shape, deselect
          if (e.target === e.currentTarget) {
            useCanvasStore.getState().selectLayer(null)
          }
        }}
      >
        <KonvaLayer>
          <Rect x={0} y={0} width={2000} height={2000} fill="#f7f7f9" />
        </KonvaLayer>
        <KonvaLayer>
          {layers.map((l: Layer) => (
            <React.Fragment key={l.id}>
              {l.type === 'image' && <KonvaImageLayer layer={l} />}
              {l.type === 'rect' && <KonvaRectLayer layer={l} />}
              {l.type === 'text' && (
                <Text text={(l as any).text || 'Text'} x={l.x} y={l.y} fontSize={20} />
              )}
            </React.Fragment>
          ))}
        </KonvaLayer>
      </Stage>
      {/* Bottom center tool selector */}
      <div className="tool-selector-container drag-guard-target">
        <ToolSelector />
      </div>
      {/* Context toolbar for the selected item */}
      {(() => {
        const selectedLayer = useCanvasStore((s: CanvasState) => s.layers.find((l) => l.id === s.selectedId) ?? null)
        const panState = useCanvasStore((s: CanvasState) => s.pan)
        const zoomState = useCanvasStore((s: CanvasState) => s.zoom)
        const left = selectedLayer ? Math.max(8, selectedLayer.x * zoomState + panState.x) : 8
        const top = selectedLayer ? Math.max(8, selectedLayer.y * zoomState + panState.y - 48) : 8
        return <SelectionToolbar layer={selectedLayer} left={left} top={top} />
      })()}
    </div>
  )
}

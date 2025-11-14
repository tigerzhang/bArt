import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Text } from 'react-konva'
import { useCanvasStore, Layer, CanvasState } from '../store/canvasStore'
// no secondary React import

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

function KonvaImageLayer({ layer }: { layer: Layer }) {
  const img = useLoadedImage(layer.src)
  const select = useCanvasStore((s: CanvasState) => s.selectLayer)
  const update = useCanvasStore((s: CanvasState) => s.updateLayer)
  return (
    <KonvaImage
      image={img ?? undefined}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      draggable
      onClick={() => select(layer.id)}
      onTap={() => select(layer.id)}
      onDragEnd={(e: any) => update(layer.id, { x: e.target.x(), y: e.target.y() })}
    />
  )
}

function KonvaRectLayer({ layer }: { layer: Layer }) {
  const select = useCanvasStore((s: CanvasState) => s.selectLayer)
  const update = useCanvasStore((s: CanvasState) => s.updateLayer)
  return (
    <Rect
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      fill="#fff"
      stroke="#cfcfcf"
      strokeWidth={2}
      draggable
      onClick={() => select(layer.id)}
      onTap={() => select(layer.id)}
      onDragEnd={(e: any) => update(layer.id, { x: e.target.x(), y: e.target.y() })}
    />
  )
}

export default function CanvasSurface() {
  const layers = useCanvasStore((s: CanvasState) => s.layers)
  const zoom = useCanvasStore((s: CanvasState) => s.zoom)
  const pan = useCanvasStore((s: CanvasState) => s.pan)
  const setZoom = useCanvasStore((s: CanvasState) => s.setZoom)
  const setPan = useCanvasStore((s: CanvasState) => s.setPan)
  const [stageSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const stageRef = useRef<any>(null)

  useEffect(() => {
    const handleResize = () => {
      // noop for now
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.scale({ x: zoom, y: zoom })
    // center stage position on zoom change (keep current pan)
    stage.position(pan)
    stage.batchDraw && stage.batchDraw()
  }, [zoom, pan])

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

  return (
    <div className="canvas-surface" style={{ width: '100%', height: '100%' }}>
      {/* left panel removed; toggle hidden */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable
        onWheel={onWheel}
        onDragMove={onDragMove}
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
    </div>
  )
}

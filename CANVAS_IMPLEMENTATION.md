# Canvas Implementation Plan — bArt

This document breaks down the implementation of the Canvas core (image + video composition) for the web editor. It follows the UX principles in `PROJECT_PLAN.md` and expands into technical tasks, components, data model, and milestones.

---

## Goals (high level)
- Provide a responsive canvas editor with Figma-like interactions: zoom, pan, multi-select, group/ungroup, snapping, alignment, and precise inspector edits.
- Support image and video layers, mask/composition, and a timeline for video projects.
- Fast exports using OffscreenCanvas and worker-based rendering for heavy tasks.
- Extensible to add more tools (vector pen, bezier shapes, filters) and collaborative editing.

---

## Top-level Architecture

- React + TypeScript UI shell + MUI for panels and dialogs
- Canvas rendering backends:
  - Primary: react-konva (2D Canvas for shapes & transforms)
  - Optional: PixiJS for heavy WebGL-powered effects; add an abstraction so we can swap renderers for specific tasks.
- State management: Zustand for app state (projects, layers, selection, timeline). Use separate stores or modules for `canvasStore`, `timelineStore`.
- Services: `AssetService` (upload/download/persist), `ExportService` (Offscreen + worker + server fallback), `ProjectService` (save/load JSON, import/export).

---

## Core Components
- `CanvasSurface` — responsible for stage-level interactions (zoom/pan, drop assets, hit testing). Exports:
  - resetTransform, zoomIn/Out, setZoom, panTo
- `LayerRenderer` — renders a single layer type: image, video, text, shape. Internally uses Konva nodes (Image, Rect, Text) and exposes transform props.
- `LayerGroup` — group multiple layers to treat them as a unit (group/ungroup)
- `LayersPanel` — contains list of layers and operations (select, reorder, rename, hide/show, lock)
  - Current layout: the `LayersPanel` has been removed from the left-hand UI to keep the canvas uncluttered. Layer operations are accessible via the `FloatingToolbar` and contextual inspector.
  - Dock vs overlay (future): A dock/overlay version could be reintroduced as an option controlled in the top toolbar for power users who want constant layer visibility.
  - Accessibility: Even though the dedicated `LayersPanel` isn't shown by default, ensure layer tools added to the `FloatingToolbar` and contextual menus are keyboard accessible and use proper ARIA attributes.
- `Inspector` — context-driven property editor; shows bounding box, transform, blend mode, masking, and effects
- `SelectionManager` — controls multi-select, selection handles, Transformer node, and keyboard shortcuts
- `TransformControls` — a wrapper around Konva `Transformer` for handles & snapping; supports rotate/scale/aspect lock
- `Timeline` — timeline UI (tracks, clips, playhead) + scrubbing; syncs playback with the Canvas for previews
- `ExportWorker` — OffscreenCanvas + worker for flattening frame(s) into PNG/JPEG or frames for video exports
- `FloatingToolbar` — vertical, left-side floating toolbar for quick tools (add image, text, draw, layers). It's compact, accessible by keyboard, and overlays the canvas.
  - Toggle layers & quick zoom: include a `Layers` icon and zoom controls (Zoom in / Zoom out) in the left-bottom overlay so users can quickly toggle the layers overlay and change zoom without leaving the bottom-left toolbar. This mirrors the screenshot pattern where toolbar controls are grouped in the bottom-left corner.
- `ContextualToolbar` — selection-anchored action toolbar that appears near selected objects; quick actions include Upscale, Remove BG, Mockup, Edit Elements, Opacity, and Download.
 - `SelectionBadge` — small overlay component that shows asset dims or crop dims (e.g., `6016 x 4016`) anchored to selection bounding box; can be expanded into `Inspector` or copy to clipboard.

---

## Data Model (TypeScript examples)

- Project
  - id: string
  - name: string
  - assets: Asset[]
  - layers: Layer[]
  - timeline: TimelineData
  - meta: { width, height, background }

- Layer (base)
  - id: string
  - name?: string
  - type: 'image' | 'video' | 'shape' | 'text' | 'group'
  - props: { x, y, rotation, scaleX, scaleY, opacity, blendMode }
  - visible: boolean
  - locked: boolean
  - style: { fill, stroke, shadow }
  - effects: Effect[]

- Image Layer extension: { assetId: string, width, height, crop: {x, y, w, h} }
  - Asset metadata: `Asset` objects should include `width`, `height`, `fileType`, `dpi` and `orientation` so we can show precise dimensions in the selection badge and decide on `Upscale`/`Export` quality.
- Video Layer extension: { assetId, start, end, volume, loop, playbackRate }
- Timeline: tracks (list), clips (layerId, startTime, duration, in/out), playhead

---

## Interactions & UX

- Zoom & Pan
  - Zoom with Ctrl+Scroll or pinch (mobile). Implement smooth zoom with lerp and `scaleX`/`scaleY` on Konva Stage.
  - Pan with spacebar + drag or two-finger pan on touch.
  - Clamp zoom to reasonable range (0.1 — 20x), keep focal point on cursor.
  - Canvas should fit the current view (100% width of the canvas container) and be scrollable when the content exceeds the visual area.
    - Full-viewport canvas: the entire application viewport is treated as the Canvas layer — toolbars and panels are floating overlays on top of the canvas and do not consume layout. This maximizes working area and simulates a true drawing surface.
      - Panels (left, right, or top) should be absolutely positioned overlays. They must be transparent to the document flow so the canvas remains the sizing anchor for everything.
      - Overlay z-index ordering: overlays (toolbars/panels/inspector) should be placed above the Konva stage but still allow the stage to receive events when overlays have pointer-events disabled (for example during a drag or when overlays are translucent).
      - Focus handling: when a panel or toolbar receives keyboard input, the canvas stage loses keyboard navigation focus; however common shortcuts (zoom, pan, tool toggles) should be supported globally by listening on the window key events.
  - Left and right panels should float above the canvas and not consume layout space by default, but both panels are docked by default in the example implementation; users can undock them to float as overlays.
    - The canvas also features a vertical, floating tool palette on the left (stacked circular icons) for quick actions (plus to add asset, text, pencil/draw, layers). Each icon opens the respective tool modal or toggles tool state.
    - Canvas should cover the browser view (100% width and height minus the app's top bar), resize on window changes, and be scrollable when the content exceeds the visual area.
    - Left and right panels should float above the canvas, aligned to the left and right edges respectively, and not consume layout space; they should remain interactive but visually overlay the canvas.
      - Panels should support auto-hide (collapse) toggles accessible in the toolbar to quickly hide/show floating panels.
      - Left and right panels can be docked to the left and right edges of the layout (always visible). Docking makes the layout a normal split — left panel, canvas center, right panel — instead of overlaying the canvas.
      - Panels and canvas are responsive: panel widths are computed at runtime from the viewport width (example: left panel ~18% of width clamped to 200–360px, right ~20% clamped to 240–420px). When a panel is hidden while docked the column collapses and the canvas expands to match the viewport. Panels that are undocked float as overlays and receive a width computed the same way.
      - Add a toolbar action `Fit viewport` that computes the bounding box of the visible layers and zooms/pans the stage to show content within view. Add toolbar toggles to dock/undock each panel and to auto-hide them.
- Selection
  - Single-click to select. Shift+click to multi-select. Click+drag to marquee select.
  - Transform with `Transformer`, anchors for rotation/scale. Allow numeric input in `Inspector`.
  - Multi-select logic updates the `selectedIds` in `canvasStore`.

  ---

  ### Drag & drop assets

  - Drop behavior: assets can be dragged from the `RightPanel` or external system and directly dropped onto the viewport (canvas). The drop will result in adding an `Image Layer` into the `canvasStore` at the drop coordinates.
    - The stage receives `dragenter`, `dragover`, `dragleave` and `drop` events (DOM overlay above Konva or Stage events depending on the drag source). `CanvasSurface` should normalize these events to a single handler which translates screen coords to canvas coords.
    - Show a drop placeholder outline or icon on `dragover` to indicate valid drop areas. If the drop is blocked (invalid file type, file too large), show a toast with an explanation.

    Code example: minimal drop handler (React + Konva)

    ```tsx
    // in CanvasSurface: attach handlers to a container element around the Konva Stage
    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      const onDragOver = (e: DragEvent) => {
        e.preventDefault()
        // Show visual drop indicator
      }
      const onDrop = (e: DragEvent) => {
        e.preventDefault()
        // If dropped files
        const files = Array.from(e.dataTransfer?.files || [])
        const imageFile = files.find(f => f.type.startsWith('image/'))
        if (imageFile) {
          // Determine drop point inside the stage
          const rect = el.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          // Translate DOM coord to stage coord after accounting for zoom & stage position
          const stage = stageRef.current
          const stagePos = stage.getPointerPosition() || { x, y }
          const scale = stage.scaleX() || 1
          const stageX = (x - stage.x()) / scale
          const stageY = (y - stage.y()) / scale

          // Create local URL and add asset to store
          const url = URL.createObjectURL(imageFile)
          const addImage = useStore.getState().addImageLayer
          addImage({ url, x: stageX, y: stageY })
        }
        // Hide drop indicator
      }

      el.addEventListener('dragover', onDragOver)
      el.addEventListener('drop', onDrop)
      return () => {
        el.removeEventListener('dragover', onDragOver)
        el.removeEventListener('drop', onDrop)
      }
    }, [containerRef.current, stageRef.current])
    ```
  - Default asset positioning: dropped assets should be centered at the drop point and scaled to fit into the canvas viewport according to `Asset.width/height` and current zoom. Optionally show a small 'preview' of the asset while the user is dragging.
  - Smart drop album: when a template is dropped from `RightPanel`, it may be inserted as a group of layers with default transforms; the canvas should offer 'preview' overlay while pointing and insert on drop.

  ---

  ### Zoom & Pan (updates)

  - The viewport canvas supports smooth zoom and pan gestures across the entire viewport. Tools and overlays do not block pinch/gesture events unless they are the active target.
  - Zoom center: the zoom should center on the cursor/finger point and not the stage center when possible. Keep keyboard & mouse compatibility (`Cmd/Ctrl + MouseWheel`) + touch pinch.
  - Pan gestures: support `spacebar + drag` or two-finger pan on touch; provide a subtle cursor change while panning to show mode.
  - Fit viewport: keep the `Fit viewport` toolbar action; it should compute the bounding box of visible layers and adjust zoom/pan so content fits inside the view (accounting for overlay margins if the right/left panels are visible by default as overlays).

  ---

  ### Overlay & event propagation

  - Overlays should be implemented as a separate React layer above the `CanvasSurface` but below modal dialogs. Use CSS `pointer-events` to control if an overlay allows click-through to the stage.
  - When overlays are interactive, they should trap events within their bounds. When a user initiates a drag on the stage and drags over overlays, temporarily set `pointer-events: none` on the overlays to allow smooth dragging operations (restore after drag finished).
  - For Konva, use stage `getPointerPosition()` to map screen positions; for pointer events that originate from overlay DOM elements, convert DOM coords to stage coords with `stage.getPointerPosition()` after calling `stage._pointerPos = {x,y}` if needed.

  CSS example: allow overlays to be click-through when dragging

  ```css
  .overlay { /* panel / left toolbar */
    position: absolute;
    z-index: 20;
    pointer-events: auto; /* interactive normally */
  }

  .overlay--click-through {
    pointer-events: none; /* allow clicks to pass through to the canvas */
  }
  ```

  In practice, toggle `.overlay--click-through` on drag start and remove it on drag end for a smooth drag experience.

    - Visual bounding box: show a highlighted outline (blue in example screenshot) with rounded control handles that scale with zoom. The bounding box should include a small pixel-dimension badge in the top-right (e.g., `6016 x 4016`) that reads from `Asset.width`/`Asset.height`. For cropping mode show crop dims instead.
    - Contextual toolbar: when an object is selected, show a compact actions panel anchored above the selection with icons for quick operations: `Upscale`, `Remove bg`, `Mockup`, `Edit Elements`, `Opacity` (opens a slider), and `Download`. Quick actions call respective services and optionally open full `Inspector` panels for detailed operations.
    - Handles & touch: anchors are rounded and increase hit zones on touch; hover expands the control indicator for desktop.
- Snapping & Guides
  - Axis-aligned snapping with a threshold; show guide lines during move.
  - Alignment tools: align left/center/right, distribute horizontally/vertically in top toolbar.
- Group/Ungroup
  - Group selected items into a `group` layer; group toggles in `LayersPanel`.
- Keyboard Shortcuts
  - `Cmd/Ctrl+C / V / X` copy/paste
  - `Cmd/Ctrl+G` group, `Cmd/Ctrl+Shift+G` ungroup
  - `Delete` to remove selection
  - `Cmd/Ctrl+Z` undo and `Cmd/Ctrl+Shift+Z` redo

  ## Right-side panel / Template manager

  The screenshot shows a right-side, personalized panel that includes a greeting and a list of template cards (e.g., 'Wine List', 'Coffee Shop Branding', 'Story Board'), a small `Switch` control, and a promo callout area.

  - Greeting & context: shows the user's name and an optional subtitle (e.g., "What are we creating today?").
  - Template cards: each card includes `title`, `description`, and `thumbnail`. Clicking a card may open a new template-based project or insert the template content into the current project. Implement `RightPanel` to support `openTemplate()` and `insertTemplate()`.
  - Switch & toggles: provide a `Switch` below the cards for quick toggles such as 'Show beginner tips' or 'Switch account / mode'.
  - Promo/Banner: bottom area can show optional information and quick actions related to promotions or usage tips. Keep this optional and easy to disable.

  Implementation details:
  - Make cards keyboard accessible and support `onHover` preview into the canvas.
  - `RightPanel` uses `templateStore`, `userStore`, and dispatches actions for the `canvasStore` when inserting templates.

---

## Rendering Strategy & Backends
- Core display: Konva with React integration (react-konva)
  - Suitable for object transforms and simple filters
  - Use `Konva.Filter` for small per-layer filters when possible
- High-performance effect pipeline: PixiJS (optional)
  - For complex GPU filters and shader-based effects, create a separate `EffectRenderer` that renders layers in Pixi and produces a canvas texture for final output
- Exporting
  - OffscreenCanvas + WebWorker to flatten layers and do pixel manipulations without blocking UI
  - For multiple frames (video), render offscreen frames and produce a frame sequence; pass it to ffmpeg.wasm or server-side FFmpeg
- Server-side fallback
  - For large jobs or unsupported codecs, client will upload assets and metadata to server and the backend will combine frames and encode video with FFmpeg

---

## Performance & Optimization
- Use `OffscreenCanvas` to decode and composite in a worker; use `createImageBitmap` for efficient bitmap decoding
- Lazy-load asset images as needed; store thumbnails and lower-res proxies for viewport rendering
- Debounce transforms in inspector to avoid too many re-renders
- Use batching in state updates for many moves (drag) using `requestAnimationFrame`
- Use selective re-render (virtualization) when there are thousands of layers

---

## Undo/Redo & History
- Implement an action/command stack recording: add/remove layer, move, transform, property change
- History entries should group related small changes (e.g., drag movement) to keep undo meaningful
- Add snapshot-based (light) or operation log-based history (preferred for fine-grained operations) with JSON serialization

---

## Timeline & Video Integration
- Each video layer's timeline maps to canvas composition: during playhead move, canvas shows correct frame for video layers
- When scrubbing: pause and render frame of each video layer on a `video` element and composite overlays (images/text) on top
- For export: render each frame from the canvas using OffscreenCanvas in worker, then pass images to ffmpeg.wasm or server to compose into video
- Sync audio using WebAudio API when playback or export step is done

---

## Tests & QA
- Unit tests: functions that compute transforms, snapping logic, and store operations
- Component tests: canvas interactions, selection, transform states using `react-testing-library` (headless) and possibly a Konva mocking helper
- E2E: Playwright test to add image, move/transform, export via worker and verify blob image is not empty
- Performance tests: automated script for rendering 1080p export and recording timing baseline

---

## Security & Permissions
- Enforce CORS-friendly assets for decoding on Offscreen; advise usage of signed URLs for cross-host resources
- Limit memory usage by capping number of active `createImageBitmap` operations concurrently

---

## Milestones & Acceptance Criteria
- Sprint 1 — Canvas core (1–2 weeks)
  - Implement `CanvasSurface` with zoom/pan and Konva Stage
  - Add selection and transform support for images
  - Add `LayersPanel` and `Inspector`
  - Acceptance: import image, move/scale/rotate, rename, reorder, and export flattened PNG
- Sprint 2 — Snapping, guides, grouping (2 weeks)
  - Implement snapping & alignment tools and group/ungroup
  - Acceptance: snapping toggled and alignment tools produce accurate results
- Sprint 3 — Video timeline implementation (2–3 weeks)
  - Implement timeline with a single video track; scrubbing updates canvas
  - Acceptance: scrub & play short video, overlays follow playhead
- Sprint 4 — Export pipeline & performance (2–3 weeks)
  - Implement worker-based export of frames, integrate ffmpeg.wasm or server fallback
  - Acceptance: Export completes for small projects and time is reasonable (<20s for 5s, 720p export on a typical dev machine)

---

## Implementation checklist (developer tasks)
- [ ] Create `CanvasSurface` and wire to `canvasStore`
- [ ] Implement `LayerRenderer` components for each layer type
- [ ] Implement `SelectionManager` and `TransformControls` with Konva `Transformer`
 - [ ] Implement `FloatingToolbar` & `ContextualToolbar` (selection quick actions)
 - [ ] Add `SelectionBadge` to show asset dimensions on selection
 - [ ] Implement `DropZone` and `AssetDrop` handlers in `CanvasSurface` (drag enter/leave/over/drop) with coordinate translation
 - [ ] Add `OverlayManager` utility to control `pointer-events` and z-index for floating panels and toolbars
 - [ ] Add `Fit viewport` to top toolbar to compute bounding box and adjust zoom/pan for full-viewport canvas
 - [x] Implement `FloatingToolbar` & `ContextualToolbar` (selection quick actions)
 - [x] Add `SelectionBadge` to show asset dimensions on selection
 - [x] Implement `DropZone` and `AssetDrop` handlers in `CanvasSurface` (drag enter/leave/over/drop) with coordinate translation
 - [x] Add `OverlayManager` utility to control `pointer-events` and z-index for floating panels and toolbars (simple CSS-based toggler)
 - [x] Add `Fit viewport` to top toolbar to compute bounding box and adjust zoom/pan for full-viewport canvas
- [ ] Add snapping guides and alignment tools in top `Toolbar`
- [ ] Add OffscreenCanvas worker and `ExportService`
- [ ] Add `Timeline` and hooks for syncing with `CanvasSurface`
 - [ ] Implement `RightPanel` with templates & promo banner
 - [ ] Make `RightPanel` & `LeftPanel` always float above the canvas (overlay) and update `App` layout to not subtract canvas space
 - [ ] Implement `RightPanel` with templates & promo banner
- [x] Make `RightPanel` & `LeftPanel` always float above the canvas (overlay) and update `App` layout to not subtract canvas space
- [ ] Add tests (unit & e2e) and configure CI
- [ ] Accessibility: keyboard navigation, semantic markup, aria attributes

---

## Notes & Tips
- Keep data model serializable and small; avoid storing huge binary blobs in the Project JSON (use assets store)
- Encapsulate renderer-specific code behind interfaces so we can switch backends
- For performance-sensitive flows (filters, complex effects), evaluate Pixi + custom shaders early in a separate validation exercise to estimate implementation cost

---

End of Canvas Implementation Plan

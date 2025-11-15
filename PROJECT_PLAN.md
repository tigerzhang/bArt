# Canvas-based Image & Video Editor — Project Plan

## Overview
This document provides a detailed plan to develop a web-based image and video editor with a canvas-driven UX similar to Figma, built with React and Material UI.

Goals:
- Provide a performant canvas editor (image + video composition)
- Familiar UI patterns for designers (drag/drop, layers, properties, inspector)
- Export and timeline for video projects
- Extensible platform for plugins and filters

Target tech stack: React + Material UI (MUI), TypeScript, and suitable canvas & media libraries (listed in Research).

---

## UX Principles (Figma-like)
- Canvas: full-screen, zoom, pan, snapping, multi-select, group/ungroup
- Left panel: Layers/Assets (organize images, video, shapes)
- Right panel: Inspector/Properties (context-driven controls)
- Top toolbar: alignment tools, transform, undo/redo, export
- Bottom: Timeline when a Video Project is active
- Drag & drop from Assets to Canvas; contextual handles for resize/scale/rotation
- Keyboard shortcuts: copy/paste/layer navigation (Cmd/Ctrl + G, ±, etc.)

---

## Architecture & Data Model
- Single page React app, TypeScript
- State: Persistable Project object with `assets`, `layers`, `timeline` (video) and `meta`.
- Serialization: JSON project save/export, images referenced as asset ID or base64 (in IndexedDB/S3)
- Layers: Each layer: { id, type:image|video|shape|text|group, props, styles, transforms }
- Effects & Filters: retained as serializable effect chains with parameter values

---

## Key Libraries & Tools (Research / Candidate list)
- Canvas rendering
  - react-konva (2D Canvas abstraction, good for shapes, transforms)
  - Fabric.js (object model, good for image editing)
  - PixiJS (WebGL performance; great for heavy effects)
  - Custom WebGL + shaders (for high-performance effects, optional)
- Video & encoding
  - ffmpeg.wasm (in-browser encoding/transcoding; heavy but complete)
  - WebCodecs & WebAssembly (for decoding & encoding when supported)
  - MediaSource API (playback), WebAudio API for audio mixing
- Real-time collaboration
  - yjs + y-websocket or y-webrtc (CRDT-based shared state)
  - ProseMirror-like diffing for content collaboration if needed
- Asset storage & backend
  - S3-compatible storage, Firebase/Firestore or Supabase for metadata
  - Optional Node backend for heavy transcoding using server-side FFmpeg
- UI
  - Material UI (MUI) components and theme
  - React Router (page navigation)
- State management
  - Zustand or Redux Toolkit (global app state), with serialization and persistence
- Offline storage
  - IndexedDB (local project caching) via Dexie.js

---

## Component Breakdown
- App Shell
  - `LeftPanel`, `Canvas`, `RightPanel`, `BottomTimeline`

  - Note: `TopBar` has been removed from the default app shell to keep the canvas uncluttered; common top-level actions are now available via the `ZoomToolbar`/`ZoomMenu` and contextual `FloatingToolbar`.
- Canvas Core
  - `CanvasSurface` (handles zoom/pan, mouse/touch events)
  - `LayerRenderer` (renders objects using chosen library: Konva, Pixi)
  - `SelectionManager` (handles multi-select, bounding box)
  - `TransformControls` (scale, rotate)
- Panels / Tools
  - `AssetsPanel`, `LayersPanel`, `PropertiesPanel` (Inspector)
    - `LayersPanel` notes: the left `LayersPanel` is removed from the default layout to keep the canvas clean; layer operations will be exposed in the `FloatingToolbar` and contextual inspector. Consider adding an advanced 'Dock' mode for users who prefer a persistent layer list.
  - `Toolbar` (Top) with actions (undo/redo, group, align)
    - Panels behave as overlays with toggles: a circular toggle button opens a panel with animation; panels include a fold/hide control to fold back to the toggle. This keeps the canvas unobstructed while exposing panel content on demand.
      - Toggle positions: Layers (left) toggle is anchored to bottom-left overlay; RightPanel toggle is anchored to top-right overlay; when a panel is open its fold button is positioned to match the toggle location so the fold animation looks like the panel folding into the toggle.
  - `FilterEditor`, `MaskingTool`, `PenPathEditor` (vector path tools)
- Timeline (Video)
  - `Tracks`, `Clip` components, `Playhead`, `Keyframes`, `Trim handles`
  - Scrubbing & playback engine (sync canvas with timeline)
- Persistence / Services
  - `AssetService`, `ProjectService`, `ExportService`
- Plugins API
  - `PluginHost` (register filters, tools), `PluginSandbox` (safety)

---

## MVP & Feature Roadmap
1. Discovery & prototyping (2-3 weeks)
   - Select core canvas library
   - Build minimal canvas: add/move/resize image layers, layers panel, inspector
  - Sample: drag images to canvas and export flattened image
2. Core image editor MVP (4-6 weeks)
   - Layers, grouping, snapping, transform handles
   - Basic filters (brightness, contrast, blur) with real-time preview
   - Text tool & vector shapes
   - Export to PNG/JPEG; import/export JSON project
3. Video timeline & composition (4-6 weeks)
   - Clip addition & trimming, playhead scrubbing, preview
   - Video layer transforms & composition with images and text overlays
   - Client-side rendering pipeline + server-side fallback for heavy export
4. Collaboration & cloud sync (3-4 weeks)
   - CRDT-based collaboration using Yjs + websockets
   - Real-time presence & cursor, comments
5. Polishing, testing, performance & deployment (3-4 weeks)
   - Accessibility, crash handling, large project performance
   - CI/CD pipelines, cross-browser QA

---

## Implementation Details
- Choose `react-konva` for v1: easy transforms, MUI integration, less boilerplate.
- For advanced filters, use WebGL via custom Pixi pipeline where needed.
- For video decoding & scrubbing: use `<video>` element for playback and WebCodecs where required; use ffmpeg.wasm for exports if browser-side is ok; otherwise provide server-side fallback.
- Rendering strategy for export:
  - Image: composite canvas layers to a single canvas (OffscreenCanvas) then toDataURL / blob.
  - Video: capture each frame composition per timeline frame then pass to ffmpeg (web or server) for encoding; or use WebCodecs if available to encode on the fly.

---

## Data & Storage
- In-memory representation: Project JSON
- Persistent store: IndexedDB for offline projects; server S3 for cloud projects with signed URL upload
- Assets: uploaded once and stored as object; reference via ID
- Large files: store locally first and then upload; stream for large video files

---

## Collaboration
- Use Yjs for CRDT; map `Project` object to Yjs documents with granular binding for layers, properties, and timeline
- Conflict resolution: default to Yjs; design UI to display concurrent edits

---

## Testing & CI
- Unit tests: Jest + React Testing Library
- End-to-end: Playwright for UI workflows (drag/drop, timeline scrub, export validation)
- Performance tests: Lighthouse & custom performance macro (render time for 1080p exports)

---

## Deployment & Hosting
- Host static site on Vercel or Netlify
- Backend (optional): Node + Express for transcoding; deploy via Docker to AWS ECS or Google Cloud Run
- Storage: S3 or Supabase Storage for quick integration

---

## Security, Privacy & Permissions
- Use pre-signed uploads for client-side file uploads
- Avoid storing unencrypted sensitive data client-side for long periods
- Add user authentication for cloud storage operations

---

## Accessibility & Internationalization
- Keyboard navigation across panels
- Proper semantic HTML for panels, and aria labels for canvas tools
- Localizable text strings (i18n)

---

## Risk & Mitigation
- Browser video export = heavy CPU; mitigation: server-side fallback and progressive rendering
- Large projects causing memory pressure: mitigation: use offscreen canvas, lazy asset loading, chunked encoding

---

## Acceptance Criteria (example)
- Image editor MVP: users can import images, move/resize/rotate, add layers, and export PNG
- Video: users can add video clip to timeline, add overlay text, scrub timeline, and export a short video

---

## Next steps
- Research & pick the canvas library (Konva vs Fabric vs Pixi)
- Implement a tiny prototype 1: drag & drop, translate, rotate + export image
 - Expand into timeline implementation for video

---

## MVP & Milestones (Expanded)

This project will be delivered iteratively in milestone-based sprints. The following describes a recommended sprint plan with rough estimates and acceptance criteria.

Milestone 1 — Image Editor Implementation (2-3 weeks)
- Goal: Validate `react-konva` for interactive canvas operations
- Tasks:
  - Minimal React + MUI shell
  - Add import image -> place on canvas
  - Add selection, drag, scale, rotate, z-order
  - Add simple layers panel & inspector with transform fields
  - Export flattened canvas PNG
- Acceptance:
  - Images can be imported and transformed with mouse/keyboard
  - Exported PNG visually matches canvas contents

Milestone 2 — Image Editor MVP (4-6 weeks)
- Goal: Implement user-facing image editing features
- Tasks:
  - Layers management (rename, hide, reorder, group)
  - Basic filters: brightness, contrast, blur
  - Text & vector shapes with editable properties
  - Undo/redo & autosave + local persistence (IndexedDB)
  - Unit tests for core modules
- Acceptance:
  - A complete project can be saved/loaded and exported to PNG
  - Filters preview in real-time and apply to layers

Milestone 3 — Timeline and Video Preview (4-6 weeks)
- Goal: Add a timeline for video composition, overlaying images/text
- Tasks:
  - Timeline UI: tracks, clips, scrubber
  - Video clip import, basic trims, and clip properties
  - Scrub sync between `<video>` playback and canvas overlay
  - Client-side export demo using ffmpeg.wasm for short clips
- Acceptance:
  - Clips can be placed and scrubbed; overlays render correctly during scrubbing
  - Small exports succeed and are playable

Milestone 4 — Collaboration & Cloud (3-4 weeks)
- Goal: Real-time collaboration & cloud persistence
- Tasks:
  - Add Yjs realtime layer for shared project state
  - Add user presence & cursors
  - Implement cloud project save/load with S3 / Supabase
- Acceptance:
  - Two or more users editing the same project see changes live

Milestone 5 — Polishing & Production Hardening (3-4 weeks)
- Goal: Performance, accessibility, and deployment
- Tasks:
  - Add E2E tests, performance profiling, and memory benchmarks
  - Progressive rendering for large projects & fallback server encoding
  - Deploy to Vercel and configure CI build & tests
- Acceptance:
  - Application passes performance & accessibility checks
  - CI deploys a production build and runs smoke tests

---

### Sprint Notes & Estimation
- Each milestone should be split into 1–2 week sprints during execution. Start with the image editor implementation to confirm assumptions then expand to features.
- Estimate buffer of ~20% for cross-browser issues and mobile optimization.

### Export & Performance Quick Wins
- Use a separate export worker thread (OffscreenCanvas + WebWorker) to avoid blocking the UI during export.
- Use thumbnails and lazy asset loading to keep memory low.

---

## Appendices

---

## Appendices
- Example project data schema
- Example UI wireframe references



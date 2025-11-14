# Research — Libraries & Implementation Options for Canvas-based Image/Video Editor

This document lists candidate libraries and tools for building a React + Material UI (MUI) canvas-based image & video editing app, their pros/cons, and recommended validation steps to confirm technology choices.

---

## Candidate Canvas Libraries

1. react-konva (Konva + React)
   - Pros:
     - High-level object model for shapes, images, groups
     - Easy React integration, good for vector-like editing
     - Transform controls, event model, hit-testing, filters
     - Mature, widely used, stable
   - Cons:
     - Uses 2D Canvas — limited to software GPU acceleration; complex WebGL shaders and per-pixel filters are harder.

2. Fabric.js
   - Pros:
     - Full-featured object model with an interactive layer
     - Great for image editing and object manipulation
     - Built-in support for serialization and exports
   - Cons:
     - Less React-friendly out of the box (requires wrappers or DOM integration)
     - Smaller ecosytem for advanced vector editing compared to Konva

3. PixiJS
   - Pros:
     - WebGL-powered — high performance for large scenes and effects
     - Good for GPU-accelerated filters & shaders
   - Cons:
     - Low-level compared to Konva; more custom work required for editor features (selection handles, grouping)
     - React integration via `react-pixi` is possible but requires planning

4. Custom WebGL + Shaders
   - Pros:
     - Ultimate control and performance
   - Cons:
     - High implementation cost; not recommended for MVP

---

## Video Processing Tools

1. ffmpeg.wasm
   - Pros:
     - Full-featured FFmpeg compiled to WASM for browser encoding/decoding
     - No server required for smaller exports
   - Cons:
     - Heavy (large WASM binary), CPU/time expensive in the browser
     - Resource-constrained on mobile

2. WebCodecs & WebAssembly decoders
   - Pros:
     - More efficient hardware-accelerated codec access in supported browsers
     - Lower overhead and better performance for real-time encoding/decoding
   - Cons:
     - Browser support is still tracking; not universal

3. MediaSource API + WebAudio
   - Pros:
     - Useful for playback, scrubbing, and audio mixing
   - Cons:
     - Not designed for generating exports; piping frames to encoders still required

4. Server-side FFmpeg
   - Pros:
     - Offloads heavy work, consistent across platforms
   - Cons:
     - Requires backend infra and signed uploads for assets

---

## Collaboration & Realtime
- Yjs: CRDT-based, good for collaborative editing and presence with `y-websocket` or `y-webrtc`.
- Automerge: Alternative CRDT approach, but Yjs is more performant for many objects.

---

## Recommendations
- Canvas: Start with `react-konva` for the V1 MVP (fast to implement, good for interactive object model)
- Performance: Add PixiJS / WebGL for heavy filters if needed; keep an abstraction layer so switching is possible
- Video: Build timeline & composition client-side using the HTML5 `<video>` element for preview. Use ffmpeg.wasm for small exports in browser; provide a server-side FFmpeg fallback for large exports or heavy encoding.
- State: Zustand for lightweight global state + persistence; use Dexie.js for local storage.
- Collaboration: Yjs for real-time collaboration.

---

## Packages / Example Commands
- Start with these dependencies for the initial prototype:

  - react, react-dom
  - typescript (optional but recommended)
  - @mui/material (MUI) + @mui/icons-material
  - react-konva, konva
  - zustand
  - dexie
  - ffmpeg.wasm (or use server-side ffmpeg)
  - yjs, y-websocket (optional)

- Example install (npm):

```bash
npm init -y
npm i react react-dom @mui/material @mui/icons-material react-konva konva zustand dexie
# For video exports / validation:
npm i @ffmpeg/ffmpeg
```

---

## Acceptance Criteria
 - Konva validation: drag/drop image to canvas, transform & export PNG — passes visual diff e2e test
 - Timeline validation: load a video, scrub, overlay text and export a short 5-second clip — verify export via ffmpeg or server
 - Collaboration validation: two clients edit the same project and changes sync in <2s

---

## Next steps
- Decide on core canvas library for MVP
- Add minimal project skeleton with `react`, `MUI`, `react-konva`, `zustand`
 - Implement Konva validation / sample and wire up simple export

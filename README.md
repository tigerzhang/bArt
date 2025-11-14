# Canvas Image & Video Editor (React + MUI)

A canvas-based editor inspired by UI design tools (Figma) supporting images and video timeline compositions.

## Quick Start

1. Clone repository

```bash
git clone <repo>
cd bArt
```

2. Install dependencies

```bash
npm ci
```

3. Start dev server

```bash
npm run dev
```

Open http://localhost:3000 — the demo contains a floating toolbar on the left, a layers overlay available from the toolbar, and a right-side panel with templates. Click the camera icon to add a sample image, drag it to move, toggle the `Layers` overlay from the toolbar to reorder, rename, hide/show and lock layers.

4. Tests

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npx playwright test
```

5. Build

```bash
npm run build
```

---

## Stack
- React + TypeScript
- Material UI (MUI)
- react-konva (canvas rendering)
- Zustand for state management
- FFmpeg (ffmpeg.wasm for client export / server ffmpeg for heavy workloads)

---

## Development Tips
- Use sample assets in `./assets` for quick experiments
- Use `OffscreenCanvas` for heavy rendering / export in workers

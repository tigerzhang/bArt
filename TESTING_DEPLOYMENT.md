# Testing, CI/CD, and Deployment Plan

## Testing Strategy

- Unit tests
  - Tooling: Jest + React Testing Library
  - Focus: reducer logic, component behavior (inspector updates), services (AssetService), and Project serialization
- Integration tests
  - Focus: canvas interactions (add / move / rotate), layer undo/redo, and persistence
  - Tools: Jest + Testing Library with JSDOM or headless renderer
- End-to-end (E2E)
  - Tooling: Playwright or Cypress
  - Scenarios:
    - Import an image -> add to canvas -> transform -> export PNG (assert file size/format)
    - Create a timeline, add video, scrub, export short video (using ffmpeg.wasm test runner or server fallback)
    - Real-time collaboration (two browser contexts)
- Performance tests
  - Tools: Lighthouse for UI performance; custom benchmarks for render/export (1080p export time)

---

## CI/CD
- Use GitHub Actions for building and running tests:
  - `ci/test.yml` runs `npm ci`, `npm run lint`, `npm test`, and `npm run build`
  - `ci/e2e.yml` runs Playwright e2e tests on headless browsers (Chromium) and uses artifacts for test artifacts
- Branch rules: require 1-2 code reviews, green CI, and e2e passing before merge to main

Example GitHub Actions snippet:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --ci
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - name: Run Playwright tests
        run: npx playwright test
``` 

---

## Deployment
- Static: host frontend on Vercel / Netlify — automatic deploys on `main` branch
- Backend (optional): Docker containerized Node + FFmpeg; host on Cloud Run, ECS, or host on a dedicated VM if heavy processing
- Storage: S3-compatible with signed uploads. Configure CORS correctly for client uploads.

---

## Local Development / Debugging
- Use `concurrently` or `npm-run-all` to run dev servers for frontend and a local dev backend
- Provide sample assets in `./assets/sample` for faster dev cycles
- Use `DEBUG=true` environment variable to show debug overlays on canvas

---

## README / Developer Commands (summary)
- Install
  - `npm ci`
- Run dev server
  - `npm run dev`
- Run tests
  - Unit: `npm test`
  - E2E: `npx playwright test`
- Build
  - `npm run build`

---

## Post-deploy Monitoring & Rollback
- Add Sentry for release monitoring
- Keep old deployment snapshots for 24–72 hours for quick rollback
- Use feature flags for big changes (e.g., switching render backend)

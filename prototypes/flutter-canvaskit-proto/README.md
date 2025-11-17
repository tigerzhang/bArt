# Flutter CanvasKit Prototype

This prototype demonstrates a minimal CanvasKit-backed Flutter web app that renders many layers, supports pan/zoom, and draggable shapes. It includes an FPS counter to help compare UI performance with the existing React + Konva app.

Prerequisites
- Flutter SDK installed and on your PATH
- Run `flutter doctor` and follow instructions if required

How to run
1. (Optional) If you need to initialize a Flutter project, run:

```bash
flutter create .
```

2. From this directory, fetch dependencies:

```bash
flutter pub get
```

3. Serve the app in CanvasKit/WebGL mode (ensures CanvasKit is used):

```bash
# Preferred (if your Flutter version supports it):
flutter run -d chrome --web-renderer canvaskit

# Fallback (older/newer Flutter versions may not support the flag; this forces Skia/CavasKit via dart-define):
flutter run -d chrome --dart-define=FLUTTER_WEB_USE_SKIA=true
```

If you see "Could not find an option named '--web-renderer'", your Flutter CLI doesn't support that flag. Use the fallback above, or update Flutter with `flutter upgrade`.

3. Performance measurement: open Chrome DevTools > Performance and record during dragging/zooming, or open ``chrome://tracing``. The app also shows a simple FPS indicator in the top-left.

Build and host a release (for better CanvasKit performance parity with production)
```
flutter build web --web-renderer canvaskit --release
python3 -m http.server --directory build/web 8080
# open http://localhost:8080
```

Deploying to www.beiwanai.com on a custom port (e.g., 9091)
1. Make sure the server is accessible via SSH and you have sudo permission to install nginx config.
2. Build and deploy using the repository deploy script from the repo root:

```bash
./deploy/deploy-flutter.sh root@www.beiwanai.com /var/www/flutter-canvaskit 9091
```

3. After the script runs, the site will be served by Nginx at `http://www.beiwanai.com:9091` if the port is open and nginx is reloaded successfully.

If you prefer to build manually and copy files, run:
```bash
cd prototypes/flutter-canvaskit-proto
flutter build web --release --dart-define=FLUTTER_WEB_USE_SKIA=true
scp -r build/web/* root@www.beiwanai.com:/var/www/flutter-canvaskit/
```
Then upload `deploy/nginx-flutter.conf` to `/etc/nginx/sites-available/flutter-canvaskit.conf` and adjust `listen` directive to 9091 (or your desired port), then symlink and reload nginx.

Measuring performance
- In Chrome, open DevTools (F12) -> Performance -> Record, then interact (drag/zoom) and stop to inspect FPS and CPU usage.
- Optionally enable the FPS counter: DevTools -> Rendering -> Show FPS meter. Record and compare FPS during the same interactions between the React/Konva app and this Flutter prototype.
- Compare bundle size: `ls -lh build/web` after `flutter build` and compare to your React build.

Notes
- This is a prototype, intended for performance comparison only. It focuses on the drawing/interaction loop rather than full feature parity with bArt.
- To compare, open your React Konva app and this Flutter web app side-by-side in Chrome and measure FPS/CPU during same actions.

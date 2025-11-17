#!/usr/bin/env bash
# Run these commands from project root
flutter pub get
# Try to run with the newer --web-renderer option (if supported); otherwise fall back
# to the dart-define flag which forces Skia/CanvasKit on some Flutter versions.
if flutter run -d chrome --web-renderer canvaskit; then
	exit 0
else
	echo "--web-renderer option not supported, trying dart-define fallback..."
	flutter run -d chrome --dart-define=FLUTTER_WEB_USE_SKIA=true
fi

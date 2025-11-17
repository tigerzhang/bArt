#!/usr/bin/env bash
set -euo pipefail

# Deploy Flutter web build to a remote host and configure nginx to serve it on a specific port.
# Usage: ./deploy-flutter.sh [remote_user@host] [remote_dir] [port]
# Defaults: root@www.beiwanai.com, /var/www/flutter-canvaskit, 9091

REMOTE_TARGET=${1:-root@www.beiwanai.com}
REMOTE_DIR=${2:-/var/www/flutter-canvaskit}
PORT=${3:-9091}
PROJECT_DIR=prototypes/flutter-canvaskit-proto
BUILD_DIR=${PROJECT_DIR}/build/web
NGINX_CONF=deploy/nginx-flutter.conf
REMOTE_NGINX_CONF=/etc/nginx/sites-available/flutter-canvaskit.conf
REMOTE_NGINX_ENABLED=/etc/nginx/sites-enabled/flutter-canvaskit.conf

# Build the Flutter web app
cd ${PROJECT_DIR}
if flutter --version >/dev/null 2>&1; then
  echo "Building Flutter web app..."
  # use canvaskit where supported; otherwise use dart-define fallback
  if flutter build web --web-renderer canvaskit --release; then
    echo "Built with --web-renderer canvaskit"
  else
    echo "--web-renderer unsupported by flutter CLI; building with dart-define fallback"
    flutter build web --dart-define=FLUTTER_WEB_USE_SKIA=true --release
  fi
else
  echo "Flutter not found on PATH. Install Flutter and try again."
  exit 1
fi
cd - >/dev/null

# Copy build files to remote host
echo "Copying ${BUILD_DIR} to ${REMOTE_TARGET}:${REMOTE_DIR}"
ssh ${REMOTE_TARGET} "sudo mkdir -p ${REMOTE_DIR} && sudo chown -R $(whoami):$(whoami) ${REMOTE_DIR} || true"
scp -r ${BUILD_DIR}/* ${REMOTE_TARGET}:${REMOTE_DIR}/
ssh ${REMOTE_TARGET} "sudo chown -R www-data:www-data ${REMOTE_DIR} || true"

# Upload and configure nginx
if [ -f "${NGINX_CONF}" ]; then
  echo "Uploading Nginx configuration (${NGINX_CONF}) to remote host..."
  scp "${NGINX_CONF}" ${REMOTE_TARGET}:/tmp/
  echo "Installing Nginx configuration on remote host and testing..."
  ssh ${REMOTE_TARGET} <<EOF
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
if [ -f "${REMOTE_NGINX_CONF}" ]; then
  sudo cp "${REMOTE_NGINX_CONF}" "${REMOTE_NGINX_CONF}.bak" || true
fi
sudo mv /tmp/nginx-flutter.conf "${REMOTE_NGINX_CONF}"
# Ensure the config points to the selected port
sudo sed -i 's/listen[[:space:]]\+[0-9]\+;/listen ${PORT};/g' "${REMOTE_NGINX_CONF}" || true
sudo ln -sf "${REMOTE_NGINX_CONF}" "${REMOTE_NGINX_ENABLED}"
sudo nginx -t
if [ $? -eq 0 ]; then
  sudo systemctl reload nginx || sudo service nginx reload || true
else
  echo "Nginx test failed on remote host; not reloading. Please check ${REMOTE_NGINX_CONF} on the server."
  exit 1
fi
EOF
else
  echo "Nginx configuration not found at ${NGINX_CONF}; skipping deploy and Nginx reload."
fi

REMOTE_HOST=${REMOTE_TARGET#*@}
echo "Deployment complete. Remote URL: http://${REMOTE_HOST}:${PORT} (if not blocked by firewall)"

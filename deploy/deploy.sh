#!/usr/bin/env bash
set -euo pipefail

# Simple deployment script to build the project locally and copy the static build to the remote server
# Usage: ./deploy.sh [remote_user@host] [remote_dir]
# Defaults to root@www.beiwanai.com and /var/www/bart

REMOTE_TARGET=${1:-root@www.beiwanai.com}
REMOTE_DIR=${2:-/var/www/bart}
BUILD_DIR=dist

echo "Building project..."
npm ci
npm run build

echo "Creating remote directory and copying build files to ${REMOTE_TARGET}:${REMOTE_DIR}"
ssh ${REMOTE_TARGET} "mkdir -p ${REMOTE_DIR} && chown -R $(whoami):$(whoami) ${REMOTE_DIR} || true"
scp -r ${BUILD_DIR}/* ${REMOTE_TARGET}:${REMOTE_DIR}/
ssh ${REMOTE_TARGET} "chown -R www-data:www-data ${REMOTE_DIR} || true"

NGINX_CONF=deploy/nginx-bart.conf
REMOTE_NGINX_CONF=/etc/nginx/sites-available/bart.conf
REMOTE_NGINX_ENABLED=/etc/nginx/sites-enabled/bart.conf

if [ -f "${NGINX_CONF}" ]; then
	echo "Uploading Nginx configuration (${NGINX_CONF}) to remote host..."
	scp "${NGINX_CONF}" ${REMOTE_TARGET}:/tmp/

	echo "Installing Nginx configuration on remote host and testing..."
	ssh ${REMOTE_TARGET} <<EOF
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
if [ -f "${REMOTE_NGINX_CONF}" ]; then
	sudo cp "${REMOTE_NGINX_CONF}" "${REMOTE_NGINX_CONF}.bak" || true
fi
sudo mv /tmp/nginx-bart.conf "${REMOTE_NGINX_CONF}"
sudo ln -sf "${REMOTE_NGINX_CONF}" "${REMOTE_NGINX_ENABLED}"
sudo nginx -t
if [ $? -eq 0 ]; then
	sudo systemctl reload nginx || sudo service nginx reload || true
else
	echo "Nginx test failed on remote host; not reloading. Please check /etc/nginx/sites-available/bart.conf on the server."
	exit 1
fi
EOF
else
	echo "Nginx configuration not found at ${NGINX_CONF}; skipping deploy and Nginx reload."
fi

echo "Deployment complete. Files are at ${REMOTE_TARGET}:${REMOTE_DIR}"

# Deploy instructions for bArt to www.beiwanai.com

This guide shows how to deploy the built static site to www.beiwanai.com using SSH and Nginx, and listen on port 9090 instead of the default port 80.

Prerequisites (on remote server):
- Node.js + npm (for building, only required if building on the server)
- nginx installed and running (we will configure it to listen on port 9090)
- SSH access with the root user or an account with privileges to write to /var/www and reload Nginx

Steps (recommended):

1. Local build + copy via SSH

```bash
# From your local repo
./deploy/deploy.sh root@www.beiwanai.com /var/www/bart
```

This will:
- run `npm ci && npm run build` locally
- copy the content of `dist/` to `/var/www/bart` on the remote host
- reload nginx on the remote host

Additionally, `deploy.sh` will also upload `deploy/nginx-bart.conf` to `/etc/nginx/sites-available/bart.conf` on the remote host and create (or update) the symlink in `/etc/nginx/sites-enabled/` before reloading nginx. The script runs `nginx -t` to validate the configuration and will not reload nginx if the test fails.

2. Configure Nginx on the remote server

Copy the bundled Nginx conf into `/etc/nginx/sites-available/` and create a symlink to `/etc/nginx/sites-enabled/`.

```bash
ssh root@www.beiwanai.com
sudo mkdir -p /var/www/bart
# place the config (you can scp it from your workstation)
sudo cp /tmp/nginx-bart.conf /etc/nginx/sites-available/bart.conf
sudo ln -s /etc/nginx/sites-available/bart.conf /etc/nginx/sites-enabled/bart.conf
sudo nginx -t && sudo systemctl reload nginx
```

Notes:
- The `deploy.sh` script sets the remote directory to `/var/www/bart` by default — change that variable when calling the script if you prefer another location.
- The `nginx` server block listens on port `9090` and sets `root /var/www/bart`.
- Make sure your firewall allows incoming TCP on port `9090` (`ufw allow 9090/tcp`, `firewall-cmd --permanent --add-port=9090/tcp` + `firewall-cmd --reload`, or configure cloud provider security groups).

If you prefer to serve the static build with a node process instead of Nginx (optional):

```bash
# install 'serve' and pm2 on the server
npm install -g serve pm2
cd /var/www/bart
pm2 start --name bArt -- serve -- -s . -l 9090
pm2 save
pm2 startup
```

This will serve static files on port 9090 and keep them alive through reboots via pm2.

SSL / HTTPS notes:
- If you want to enable HTTPS, you will normally need port 80 or 443 available for certbot.
- If you use HTTPS with Let's Encrypt, handle that on port 80 for challenge, then proxy to 9090 or change nginx to listen 443 after certificate setup.

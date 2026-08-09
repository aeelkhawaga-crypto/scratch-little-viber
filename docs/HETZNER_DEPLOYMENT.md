# Hetzner VM deployment

This deployment runs the complete Scratch Vibe Coder stack on one Hetzner VM:

- Caddy serves the production frontend, provides HTTPS, and protects the site with HTTP Basic Authentication.
- The Node API proxies Hugging Face requests and exposes the feedback/experiment endpoints.
- PostgreSQL stores request telemetry, generated XML, ratings, notes, difficulties, and experiment IDs.
- Docker volumes persist PostgreSQL data and Caddy certificates across container replacements.

Only ports 80 and 443 are published. PostgreSQL and the Node API remain private inside the Docker network. The Hugging Face token is available only to the API container and is never compiled into the frontend.

## 1. Prepare the VM

Use an Ubuntu 24.04 VM with at least 4 vCPUs and 8 GB RAM. The frontend build is memory intensive; a smaller VM may require swap.

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git ufw
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the user to the Docker group.

Allow SSH and web traffic:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Apply equivalent inbound rules in the Hetzner Cloud Firewall. Do not expose ports 5432 or 3456.

## 2. Configure DNS

Create an `A` record for the deployment domain pointing to the VM's public IPv4 address. Add an `AAAA` record when IPv6 is configured. Caddy will obtain and renew the TLS certificate automatically after DNS resolves.

## 3. Clone and configure

```bash
git clone https://github.com/aeelkhawaga-crypto/scratch-little-viber.git
cd scratch-little-viber
git switch develop
cp .env.production.example .env.production
```

Edit `.env.production` and set:

- `DOMAIN`: the public hostname, without `https://`.
- `HF_TOKEN`: a Hugging Face token allowed to call Inference Providers.
- `POSTGRES_PASSWORD`: a long random database password.
- `BASIC_AUTH_USER`: the username required to open the site.
- `BASIC_AUTH_HASH`: a Caddy-compatible password hash.

Generate the Basic Authentication hash:

```bash
docker run --rm caddy:2.10-alpine caddy hash-password --plaintext 'replace-with-a-long-password'
```

Paste the complete hash into `.env.production`. Keep it single-quoted because bcrypt hashes contain dollar signs.

Protect the environment file:

```bash
chmod 600 .env.production
```

## 4. Start the stack

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
```

The first startup initializes the database with `scripts/hf-telemetry.sql`. The API also applies additive schema updates at startup.

Verify the authenticated API through Caddy:

```bash
curl --user 'researcher:your-password' "https://scratch.example.com/api/health"
```

Expected response:

```json
{"ok":true}
```

Open the domain in a browser. The feedback popup provides the experiment table and allows prompt, response, rating, outcome, notes, and difficulty maintenance.

## 5. Move the existing local dataset

Create a compressed dump on the current development machine:

```bash
pg_dump --format=custom --no-owner --no-acl \
  --file scratch_viber.dump \
  postgres://localhost:5432/scratch_viber
```

Copy it to the VM:

```bash
scp scratch_viber.dump your-user@your-vm:/tmp/scratch_viber.dump
```

Restore it after the containers are healthy. This replaces the empty initialized tables with the dumped dataset:

```bash
docker compose --env-file .env.production exec -T db \
  sh -c 'pg_restore --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --clean --if-exists --no-owner' < /tmp/scratch_viber.dump

docker compose --env-file .env.production restart api
```

Delete the transferred dump after verifying the record counts because it contains prompts, responses, and feedback:

```bash
rm /tmp/scratch_viber.dump
```

## 6. Backups

Create regular encrypted/off-site backups. A manual custom-format backup is:

```bash
mkdir -p backups
docker compose --env-file .env.production exec -T db \
  sh -c 'pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --format=custom --no-owner --no-acl' > backups/scratch_viber.dump
```

Test restoration periodically. A volume snapshot alone is not a substitute for a database-aware backup.

## 7. Deploy updates

```bash
git pull --ff-only origin develop
docker compose --env-file .env.production up -d --build
docker image prune -f
```

Database data and TLS certificates remain in named volumes.

## 8. Operations

Inspect service health and logs:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production logs --tail=200 web
docker compose --env-file .env.production logs --tail=200 db
```

Restart one service:

```bash
docker compose --env-file .env.production restart api
```

Stop the application without deleting data:

```bash
docker compose --env-file .env.production down
```

Never add `--volumes` unless the PostgreSQL and Caddy volumes are intentionally being deleted and a verified backup exists.

## Existing host Nginx

When ports 80 and 443 are already owned by host Nginx, use `compose.nginx.yaml`. It serves a prebuilt `build/` directory through an internal Caddy container bound only to `127.0.0.1:3458`; PostgreSQL and the API remain private in Docker. Copy `deploy/nginx-scratch-viber.conf` to a new Nginx site, replace `__SERVER_NAME__`, and let Certbot add TLS. The password file `/etc/nginx/.htpasswd-scratch-viber` must be owned by `root:www-data` with mode `640`, so Nginx workers can read it without making it public. Validate with `nginx -t` before every reload. This mode avoids replacing existing web services and also avoids compiling the memory-intensive Scratch frontend on a small production VM.

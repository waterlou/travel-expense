# Deploy to Fly.io (SQLite)

Fly.io provides persistent volumes that work perfectly with SQLite. This is the simplest deployment path if you want to keep SQLite.

## Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed and logged in (`fly auth login`)
- A [Fly.io](https://fly.io) account (free tier: 3 VMs, 3GB persistent volume)
- Docker installed and running

## Step-by-step

### 1. Launch the app

```bash
cd travelexpense

# Create a Fly app — auto-detects Dockerfile
fly launch --name your-app-name --no-deploy

# Answer prompts:
#   Region: choose the closest one
#   Postgresql: N (we use SQLite)
#   Redis: N
```

This creates `fly.toml` and `.dockerignore`.

### 2. Create a persistent volume for SQLite

```bash
# Create a 1GB volume named "data" in the same region
fly volumes create data --region hkg --size 1
# Use your region from step 1 instead of hkg
```

### 3. Configure fly.toml

Edit `fly.toml` to add the volume mount and internal port:

```toml
app = "your-app-name"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[mounts]]
  source = "data"
  destination = "/app/data"
```

### 4. Set environment secrets

```bash
fly secrets set \
  NEXTAUTH_URL="https://your-app-name.fly.dev" \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  GOOGLE_CLIENT_ID="your-google-client-id" \
  GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  BASE_PATH=""
```

- Replace `your-app-name` with your actual Fly app name
- For Google OAuth, add `https://your-app-name.fly.dev/api/auth/callback/google` to your Google Cloud Console redirect URIs
- If you want a custom domain, set `NEXTAUTH_URL` to your domain

### 5. Run database migrations

```bash
fly deploy  # Deploy the app

# Run migrations
fly ssh console -C "cd /app && npx prisma migrate deploy"
```

### 6. Deploy

```bash
fly deploy
```

Your app is now live at `https://your-app-name.fly.dev`

## Custom domain

```bash
fly certs add yourdomain.com
```

Then add the CNAME record from `flyctl certs show yourdomain.com` to your DNS provider.

If you want the app at a subpath (e.g. `yourdomain.com/travel-expense`):

```bash
fly secrets set BASE_PATH="/travel-expense"
```

## Updating

```bash
git push  # or
fly deploy
```

## Backup SQLite database

```bash
fly ssh console -C "cat /app/data/travelexpense.db" > backup-$(date +%Y%m%d).db
```

## Pricing

- Free tier: 3 shared VMs with 256MB RAM each
- Volume: $0.15/GB/month (1GB = $0.15/month)
- Total: roughly **free to $0.15/month**

# Deploy to Render (PostgreSQL)

Render is a good choice if you want PostgreSQL. It has a free PostgreSQL tier and supports Docker deployments.

## Prerequisites

- A [Render](https://render.com) account
- Your code pushed to a GitHub repository

## Step-by-step

### 1. Create a PostgreSQL database

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Fill in:
   - **Name**: `travelexpense-db`
   - **Database**: `travelexpense`
   - **User**: `travelexpense`
   - **Region**: closest to you
   - **Plan**: Free ($0/month)
3. Click **Create Database**
4. After creation, copy the **Internal Database URL** (looks like `postgresql://user:pass@host:5432/travelexpense`)

> ⚠️ The free PostgreSQL instance will be deleted after 90 days. Set a reminder to migrate to a paid plan or back up your data before then.

### 2. Configure Prisma for PostgreSQL

Update `prisma/schema.prisma` to use PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Also create a migration lock file for PostgreSQL:

```bash
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

### 3. Create a Web Service

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect your GitHub repository
3. Fill in:
   - **Name**: `travelexpense`
   - **Region**: closest to you
   - **Branch**: `main`
   - **Runtime**: **Docker**
   - **Build Command**: (leave empty — Dockerfile handles it)
   - **Start Command**: (leave empty — Dockerfile handles it)
   - **Plan**: **Free** ($0/month)

### 4. Set environment variables

Under the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your PostgreSQL Internal Database URL from step 1 |
| `NEXTAUTH_URL` | `https://travelexpense.onrender.com` (or your custom domain) |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `BASE_PATH` | Leave empty |

### 5. Add Google OAuth redirect URI

Add `https://travelexpense.onrender.com/api/auth/callback/google` to your Google Cloud Console authorized redirect URIs.

### 6. Deploy

Click **Create Web Service**. Render will build the Docker image and deploy automatically.

First deployment takes 3-5 minutes. Subsequent builds are faster due to Docker layer caching.

### 7. Run migrations

After the first deploy, open the Render shell:

1. Go to your Web Service → **Shell** tab
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

Or add a startup script — create `start.sh`:

```bash
#!/bin/bash
npx prisma migrate deploy
npx next start
```

Update your `Dockerfile` to use this script as the `CMD`.

## Custom domain

1. Go to your Web Service → **Settings** → **Custom Domain**
2. Add your domain and follow the DNS instructions

To use a subpath (e.g. `yourdomain.com/travel-expense`), set:

```
BASE_PATH=/travel-expense
```

## Updating

Push to your GitHub repository's main branch. Render auto-deploys.

```bash
git push origin main
```

## Pricing

- Web Service (free): 512MB RAM, 100GB outbound bandwidth/month, sleeps after 15 min of inactivity
- PostgreSQL (free): 256MB RAM, 1GB storage, expires after 90 days
- Total: **free for 90 days, then ~$7/month** for the minimum PostgreSQL plan

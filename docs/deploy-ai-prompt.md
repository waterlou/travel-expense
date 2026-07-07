# AI Deployment Prompt

Copy and paste this prompt into any AI coding agent (Claude, ChatGPT, etc.) to have it deploy the app for you.

---

## Prompt: Deploy TravelExpense

I have a Next.js travel expense tracking app at `[REPO_PATH]` that I want to deploy to Fly.io (preferred) or Render. The app uses:

- Next.js 15 with App Router
- Material UI v7
- NextAuth.js v4 with Google OAuth
- Prisma ORM with SQLite (default)
- Docker deployment

Please deploy this app for me. Here's what needs to be done:

### 1. On Fly.io (preferred — SQLite)

Create a `fly.toml` with:
- `internal_port = 3000`
- A persistent volume mount at `/app/data` for SQLite
- `force_https = true`
- `auto_stop_machines = false`

Run the following commands:

```bash
# Login and launch
fly auth login
fly launch --name [APP_NAME] --region hkg --no-deploy
# Answer: No to Postgres, No to Redis

# Create persistent volume for SQLite DB
fly volumes create data --region hkg --size 1

# Set environment secrets
fly secrets set \
  NEXTAUTH_URL="https://[APP_NAME].fly.dev" \
  NEXTAUTH_SECRET="[RANDOM_32_BYTE_BASE64]" \
  GOOGLE_CLIENT_ID="[FROM_GOOGLE_CLOUD]" \
  GOOGLE_CLIENT_SECRET="[FROM_GOOGLE_CLOUD]"

# Deploy
fly deploy

# Run migrations
fly ssh console -C "cd /app && npx prisma migrate deploy"
```

### 2. Google OAuth Setup

Tell me to:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `https://[APP_NAME].fly.dev/api/auth/callback/google`
4. Share the Client ID and Client Secret with you

### 3. Environment Variables Needed

| Variable | Source |
|---|---|
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://[APP_NAME].fly.dev` |

### 4. Custom Domain (optional)

If I provide a domain, configure:
1. `fly certs add mydomain.com`
2. `NEXTAUTH_URL=https://mydomain.com`
3. Add CNAME record to DNS

### 5. Subpath (optional)

If I want the app at `mydomain.com/travel-expense`, set `BASE_PATH=/travel-expense`.

### 6. Verify

After deployment, visit the URL and confirm:
- Landing page loads
- Google Sign-In works
- Creating a travel works
- Adding expenses works
- Balance page renders
- PDF export downloads correctly

---

### Fallback: Render (PostgreSQL)

If Fly.io doesn't work, deploy on Render instead:

1. Create a free PostgreSQL DB on Render (copy Internal Database URL)
2. Update `prisma/schema.prisma` to use `provider = "postgresql"`
3. Create a Web Service from the GitHub repo using Docker runtime
4. Set environment variables:
   - `DATABASE_URL` = PostgreSQL Internal URL
   - `NEXTAUTH_URL` = Render service URL
   - All Google OAuth variables
5. Add `https://[RENDER_URL]/api/auth/callback/google` to Google Cloud Console
6. Deploy and run `npx prisma migrate deploy`

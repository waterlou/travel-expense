# TravelExpense

A web-based travel expense tracking app that you can self-host. Track shared expenses for your trips, split bills, manage multiple currencies, and settle up easily.

## Features

- **Travel Groups** — Create a travel, invite members via code/link
- **Expense Tracking** — Log expenses with date, amount, currency, splits
- **Multi-Currency** — Main currency + up to 10 additional currencies
- **Smart Splits** — Equal split or manual amounts; auto-calculates remaining
- **Calculator** — Built-in popup calculator for quick amount entry
- **Unconfirmed Items** — Flag pre-booked items (hotels, tickets) as unconfirmed
- **Balance View** — See who owes whom, per-currency and with exchange rate conversion
- **Image Receipts** — Upload receipt images per expense
- **Permission Levels** — 4 levels from admin-only to free-for-all
- **Mobile Friendly** — Responsive MUI design with bottom navigation
- **Custom Prefix** — Embed at `yoursite.com/travel/mytrip`
- **Google Auth** — Sign in with Google

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)

### Setup

1. **Clone and install**

```bash
git clone <repo> travelexpense
cd travelexpense
npm install
```

2. **Set up Google OAuth**

Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Create an OAuth 2.0 Client ID (Web application)
- Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your values:
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from step 2
# - NEXTAUTH_SECRET: run `openssl rand -base64 32`
```

To serve the app under a subpath (e.g. `https://example.com/travel-expense`), set `BASE_PATH=/travel-expense` and make sure `NEXTAUTH_URL` includes it (`https://example.com/travel-expense/api/auth`). `BASE_PATH` is inlined at build time — changing it requires a rebuild.

4. **Initialize database**

```bash
npx prisma migrate dev --name init
```

5. **Run**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker Deployment (SQLite)

```bash
# Set environment variables
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Build and run
docker compose up -d
```

### Docker Deployment (PostgreSQL)

```bash
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Run with PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# Run migrations
docker compose -f docker-compose.postgres.yml exec app npx prisma migrate deploy
```

## Single-User Mode

Set `NEXT_PUBLIC_SINGLE_USER_MODE=true` in `.env` to turn the app into a personal expense tracker:

- No login anywhere — the app opens straight into your travels
- One fixed user (`Admin`) owns every travel; members/invites/groups UI and APIs are disabled
- Auth pages (`/login`, `/register`, `/invite`) redirect home

Notes:

- The flag is inlined into the client bundle and middleware at build time — changing it requires a rebuild/restart.
- Expect a **fresh database**: travels whose members are bound to other user ids (or unclaimed) don't appear in single-user mode.
- With the flag empty/absent, full multi-user behavior is unchanged.

## Deployment Guides

- [Deploy to Fly.io (SQLite)](docs/deploy-fly-io.md)
- [Deploy to Render (PostgreSQL)](docs/deploy-render.md)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Material UI (MUI) v7
- **Database**: SQLite (default) / PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v4 with Google OAuth
- **Deployment**: Docker + Docker Compose

## Adding Apple Sign-In

See [docs/apple-auth-setup.md](docs/apple-auth-setup.md) for instructions on adding Apple authentication.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Login page
│   ├── register/             # Register page
│   ├── invite/               # Invite join page
│   ├── [prefix]/             # Travel group routes
│   │   ├── page.tsx          # Dashboard
│   │   ├── expenses/         # Expense CRUD
│   │   ├── members/          # Member list + invite
│   │   ├── balance/          # Balance + exchange rates
│   │   └── settings/         # Travel settings
│   └── api/                  # REST API routes
├── components/               # Reusable components
├── lib/                      # Utilities, auth config, prisma
├── middleware.ts             # Auth middleware
└── theme.ts                  # MUI theme
```

## License

MIT

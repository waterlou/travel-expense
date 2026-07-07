# Adding Apple Sign-In

## Prerequisites

- An active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- Your app's bundle identifier (e.g., `com.travelexpense.app`)

## Steps

### 1. Configure App ID in Apple Developer Portal

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles
2. Identifiers → Register a new identifier → App IDs
3. Enable **Sign in with Apple** capability
4. Note your **Service ID** (for web auth) or configure for native app

### 2. Create a Service ID (for Web)

1. Identifiers → Register → Services IDs
2. Create a Service ID (e.g., `com.travelexpense.web`)
3. Configure Sign in with Apple for this Service ID
4. Add the domain where your app is hosted
5. Add the return URL: `https://yourdomain.com/api/auth/callback/apple`

### 3. Generate a Private Key

1. Keys → Register a new key
2. Enable **Sign in with Apple**
3. Configure with the Service ID from step 2
4. Download the `.p8` key file (one-time download!)
5. Note the **Key ID**

### 4. Add Environment Variables

Add to your `.env` file:

```bash
APPLE_ID=your-service-id (e.g., com.travelexpense.web)
APPLE_TEAM_ID=your-team-id (from developer.apple.com)
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_KEY_ID=the-key-id-from-step-3
```

### 5. Update Auth Configuration

In `src/lib/auth.ts`, add the Apple provider:

```typescript
import AppleProvider from 'next-auth/providers/apple'

// Add to providers array:
AppleProvider({
  clientId: process.env.APPLE_ID!,
  clientSecret: {
    teamId: process.env.APPLE_TEAM_ID!,
    privateKey: process.env.APPLE_PRIVATE_KEY!,
    keyId: process.env.APPLE_KEY_ID!,
  },
}),
```

### 6. Rebuild and Deploy

```bash
npm run build
# or
docker compose build
docker compose up -d
```

## Testing

- Sign out and verify the "Sign in with Apple" button appears
- Complete the Apple auth flow
- Verify the user is redirected back correctly

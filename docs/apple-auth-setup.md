# Apple Sign-In Setup

## Prerequisites

- An active [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- The app's bundle/Service ID (e.g., `com.travelexpense.web`)

## Step-by-step

### 1. Create a Service ID

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles
2. Click **Identifiers** → **+** → **Services IDs**
3. Enter a description and identifier (e.g., `com.travelexpense.web`)
4. Click **Continue** → **Register**

### 2. Enable Sign in with Apple for the Service ID

1. Find your Service ID in the identifiers list
2. Click it → check **Sign in with Apple** → **Configure**
3. Select the **Primary App ID** (any existing app, or create a new App ID)
4. Under **Return URLs**, add: `https://yourdomain.com/api/auth/callback/apple`
   - For local dev: `http://localhost:3000/api/auth/callback/apple`
5. Click **Save**

### 3. Generate a Private Key

1. Go to **Keys** → **+** (or [developer.apple.com/account/resources/authkeys](https://developer.apple.com/account/resources/authkeys))
2. Check **Sign in with Apple**
3. Click **Configure** and select the Service ID from step 1
4. Click **Continue** → **Register**
5. **Download the `.p8` key file** (one-time download — keep it safe!)
6. Note the **Key ID** (displayed on the key details page)

### 4. Get Your Team ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Your **Team ID** is shown under **Membership** or in the top-right corner

### 5. Extract the Private Key

The downloaded `.p8` file looks like:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

For the `.env` file, replace newlines with `\n`:

```bash
# Read your .p8 file and format for .env
awk 'NF {printf "%s\\n", $0}' /path/to/AuthKey_XXXXXXXXXX.p8
```

### 6. Add Environment Variables

Add to your `.env` file:

```bash
APPLE_CLIENT_ID=com.travelexpense.web
APPLE_TEAM_ID=ABC123DEFG
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

### 7. Build and Test

```bash
npm run build
npm run dev
```

Visit `/login` and click **Sign in with Apple**. You should be redirected to Apple's sign-in page and back to the app after authenticating.

## Troubleshooting

| Issue | Fix |
|---|---|
| `redirect_uri` mismatch | Ensure the Return URL in Apple Developer portal matches `NEXTAUTH_URL/api/auth/callback/apple` |
| Invalid client secret | Check that `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` are correct |
| "Invalid ID" error | The Service ID must match `APPLE_CLIENT_ID` |
| Error during dev on localhost | Apple requires HTTPS for production, but `http://localhost` is allowed |

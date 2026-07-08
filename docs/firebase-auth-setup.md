# Firebase Phone Auth (OTP) Setup

This doc covers setting up Firebase Phone Authentication for users who don't want to use Google or Apple sign-in.

## Prerequisites

- A Google account (for Firebase console)
- A credit card (required by Firebase to enable phone auth, even on the free tier)

## Pricing

- **Free**: 10,000 phone verifications per month
- **Paid**: $0.01 per verification after the first 10K
- Credit card is required to enable billing, but you won't be charged within the free tier

## Step-by-step

### 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Create a project** (or select existing)
3. Follow the wizard — you can disable Google Analytics if you don't need it

### 2. Enable Phone Authentication

1. In your Firebase project, go to **Authentication** → **Sign-in method**
2. Click **Phone** and enable it
3. You may need to set up billing first — click **Set up billing** and add your credit card

### 3. Add a Web App

1. Go to **Project Settings** → **General** → **Your apps** → **Add app** → **Web**
2. Register the app (nickname can be anything)
3. Copy the **firebaseConfig** values:
   - `apiKey`
   - `authDomain`
   - `projectId`

### 4. Generate a Service Account Key

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file — it contains:
   - `projectId`
   - `clientEmail`
   - `privateKey`

### 5. Add Environment Variables

Add to your `.env` file:

```bash
# Client-side (public) — from Firebase Web App config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project

# Server-side (admin) — from Firebase Service Account JSON
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----"
FIREBASE_ADMIN_PROJECT_ID=your-project
```

> **Note for `FIREBASE_ADMIN_PRIVATE_KEY`:** The private key from the JSON file contains actual newlines. Replace them with `\n` for the `.env` file. Run:
> ```bash
> awk 'NF {printf "%s\\n", $0}' /path/to/service-account-key.json
> ```

### 6. Test

1. Start the dev server
2. Go to `/login` — you should see a "Sign in with Phone" button
3. Enter your phone number (with country code, e.g. `+85291234567`)
4. Click "Send OTP" — you'll receive an SMS with a 6-digit code
5. Enter the code and you're signed in

## How It Works

1. User enters phone number → Firebase `signInWithPhoneNumber()` sends SMS
2. User enters OTP → Firebase verifies and returns an ID token (JWT)
3. Client sends the ID token to NextAuth's credentials provider
4. Server verifies the token with Firebase Admin SDK
5. If the phone number is new, a User record is created (email = phone number)
6. Session is created — user is logged in

## Notes

- Phone numbers are stored as the `email` field on the User model (since it's the unique identifier)
- The same phone number works across devices — sign in on any phone with the same number
- If you reach the 10K free limit, Firebase will bill your card $0.01 per verification
- reCAPTCHA verification runs automatically in the background (invisible mode)

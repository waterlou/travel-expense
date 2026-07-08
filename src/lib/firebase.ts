'use client'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, Auth } from 'firebase/auth'

let _auth: Auth | null = null

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth
  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  }
  _auth = getAuth()
  return _auth
}

export { RecaptchaVerifier, signInWithPhoneNumber }

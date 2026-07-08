import { initializeApp, cert, getApps, ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export async function getFirebaseAdmin() {
  if (getApps().length) return getAuth()

  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    } as ServiceAccount),
  })

  return getAuth()
}

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import jwt from 'jsonwebtoken'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

const bp = process.env.BASE_PATH || ''
const cookiePath = `${bp}/api/auth`
const isSecure = process.env.NODE_ENV === 'production' || !!bp
const sameSite = bp ? 'none' : 'lax'

function pb(path: string) {
  return bp ? `${bp}${path}` : path
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  cookies: {
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite,
        path: cookiePath,
        secure: isSecure,
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite,
        path: cookiePath,
        secure: isSecure,
      },
    },
    nonce: {
      name: 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite,
        path: cookiePath,
        secure: isSecure,
      },
    },
  },
  pages: {
    signIn: pb('/login'),
    error: pb('/api/auth/error'),
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
}

// Add Phone provider only if Firebase env vars are set
if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  authOptions.providers.push(
    CredentialsProvider({
      id: 'phone',
      name: 'Phone',
      credentials: {},
      async authorize(credentials: any) {
        if (!credentials?.idToken) return null
        try {
          const { getFirebaseAdmin } = await import('./firebase-admin')
          const admin = await getFirebaseAdmin()
          const decoded = await admin.verifyIdToken(credentials.idToken)
          const phone = decoded.phone_number
          if (!phone) return null
          const user = await prisma.user.upsert({
            where: { email: phone },
            create: { email: phone, name: phone, emailVerified: new Date() },
            update: {},
          })
          return { id: user.id, name: user.name, email: user.email }
        } catch {
          return null
        }
      },
    })
  )
}

// Add Apple provider only if env vars are set
const appleClientId = process.env.APPLE_CLIENT_ID
const appleTeamId = process.env.APPLE_TEAM_ID
const appleKeyId = process.env.APPLE_KEY_ID
const applePrivateKey = process.env.APPLE_PRIVATE_KEY
if (appleClientId && appleTeamId && appleKeyId && applePrivateKey) {
  const secret = jwt.sign(
    {
      iss: appleTeamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 180,
      aud: 'https://appleid.apple.com',
      sub: appleClientId,
    },
    applePrivateKey.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', keyid: appleKeyId }
  )
  authOptions.providers.push(
    AppleProvider({
      clientId: appleClientId,
      clientSecret: secret,
    })
  )
}

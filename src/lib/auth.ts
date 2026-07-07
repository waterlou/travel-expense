import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import jwt from 'jsonwebtoken'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

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
  pages: {
    signIn: '/login',
    error: '/api/auth/error',
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

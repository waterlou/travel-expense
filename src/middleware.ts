import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Catch NextAuth error redirects that may miss the basePath
    if (pathname === '/api/auth/error') {
      const basePath = process.env.BASE_PATH || ''
      if (basePath) {
        return NextResponse.redirect(new URL(`${basePath}/api/auth/error`, req.url))
      }
    }

    // Allow all auth routes, rates-proxy, and uploads to pass through
    if (
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/rates-proxy') ||
      pathname.startsWith('/uploads')
    ) {
      return NextResponse.next()
    }

    if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/invite')) {
      if (token && pathname !== '/invite') return NextResponse.redirect(new URL('/', req.url))
      return NextResponse.next()
    }

    if (!token && pathname !== '/') {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname === '/register' ||
          pathname.startsWith('/invite') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/api/rates-proxy') ||
          pathname.startsWith('/uploads')
        ) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

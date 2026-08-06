import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const basePath = process.env.BASE_PATH || ''
const singleUser = process.env.NEXT_PUBLIC_SINGLE_USER_MODE === 'true'

// req.nextUrl.pathname includes basePath; strip it before comparing against
// app routes. No-op when BASE_PATH is unset. BASE_PATH must be '' or a
// non-root subpath (existing contract).
function stripBasePath(raw: string): string {
  return basePath && raw.startsWith(basePath) ? raw.slice(basePath.length) || '/' : raw
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = stripBasePath(req.nextUrl.pathname)

    if (singleUser) {
      // No login exists in single-user mode; send auth-only pages home.
      if (pathname === '/login' || pathname === '/register' || pathname.startsWith('/invite')) {
        return NextResponse.redirect(new URL(basePath || '/', req.url))
      }
      return NextResponse.next()
    }

    // Never auth-gate static assets (the matcher can include them when BASE_PATH is set)
    if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') {
      return NextResponse.next()
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
      if (token && pathname !== '/invite') return NextResponse.redirect(new URL(basePath || '/', req.url))
      return NextResponse.next()
    }

    if (!token && pathname !== '/') {
      const loginUrl = new URL(`${basePath}/login`, req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = stripBasePath(req.nextUrl.pathname)
        if (singleUser) return true
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname === '/register' ||
          pathname.startsWith('/invite') ||
          pathname.startsWith('/api/auth/') ||
          pathname.startsWith('/api/rates-proxy') ||
          pathname.startsWith('/uploads') ||
          pathname.startsWith('/_next/') ||
          pathname === '/favicon.ico'
        ) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

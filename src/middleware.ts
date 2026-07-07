import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

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
        if (pathname === '/' || pathname === '/login' || pathname === '/register' || pathname.startsWith('/invite')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)'],
}

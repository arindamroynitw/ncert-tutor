import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to auth pages without authentication
        if (pathname.startsWith('/signin') || pathname.startsWith('/signup')) {
          return true;
        }

        // Allow access to API routes (except protected ones)
        if (pathname.startsWith('/api/')) {
          // Allow signup API without auth
          if (pathname === '/api/signup') {
            return true;
          }
          // Allow NextAuth API routes without auth
          if (pathname.startsWith('/api/auth/')) {
            return true;
          }
          // All other API routes require auth
          return !!token;
        }

        // All other routes require authentication
        return !!token;
      }
    },
    pages: {
      signIn: '/signin'
    }
  }
);

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};

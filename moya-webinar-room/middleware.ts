import { NextResponse, type NextRequest } from 'next/server';
import { classifyHostname } from './lib/domains';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  
  // Extract and normalize hostname
  let hostname = request.headers.get('host') || '';
  hostname = hostname.split(':')[0].toLowerCase(); // Strip port

  // Classify the domain
  const domainType = await classifyHostname(hostname);

  // 1. Auth check (Preserve existing logic for Admin routes)
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(
    (c) => c.name.includes('auth-token') || c.name.includes('sb-')
  );

  // 2. Block Admin on Attendee/Custom domains
  if ((domainType === 'ATTENDEE' || domainType === 'CUSTOM') && pathname.startsWith('/admin')) {
    // Hide admin routes from live domains by returning 404
    return new NextResponse('Not Found', { status: 404 });
  }

  // 3. Admin Domain routing restrictions
  if (domainType === 'ADMIN') {
    // Admin domain should NOT serve attendee routes directly
    if (pathname.startsWith('/w/') || pathname.startsWith('/webinar/')) {
        return new NextResponse('Not Found', { status: 404 });
    }
  }

  // 4. Proceed with existing auth redirects for allowed admin routes
  if (
    !hasAuthCookie &&
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login')
  ) {
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  if (hasAuthCookie && pathname === '/admin/login') {
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes, we want them accessible everywhere)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if exists
  const { data: { user } } = await supabase.auth.getUser();

  // Define protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Redirect logic
  if (!user && isDashboardPage) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (user && isAuthPage && !request.nextUrl.pathname.includes('/pending')) {
    // Check if user is approved
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('approved')
      .eq('user_id', user.id)
      .single();

    if (!adminUser || !adminUser.approved) {
      return NextResponse.redirect(new URL('/auth/pending', request.url));
    }

    return NextResponse.redirect(new URL('/dashboard/overview', request.url));
  }

  return response;
}

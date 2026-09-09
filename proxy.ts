import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Reads valid sessions locally and only contacts Auth when a token needs refresh.
  // Authorization itself is always enforced by database RLS and secured RPCs.
  const { data: { session } } = await supabase.auth.getSession();

  const isJoinPage = request.nextUrl.pathname === "/join" || request.nextUrl.pathname.startsWith("/join/");
  if (isJoinPage && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("mode", "signup");
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/groups/:path*",
    "/join/:path*",
    "/notifications/:path*",
    "/prayers/:path*",
    "/search/:path*",
    "/settings/:path*",
    "/api/push/test",
  ],
};

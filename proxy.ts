import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/navigation";

const PROTECTED_PAGE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/groups",
  "/notifications",
  "/prayers",
  "/search",
  "/settings",
];

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function copyAuthState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Validates the JWT and refreshes expired tokens before Server Components run.
  let { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const transientAuthFailure = (error: typeof claimsError) => Boolean(error && (
    Number(error.status ?? 0) >= 500
    || /fetch|network|timeout|connection/i.test(error.message)
  ));
  if (transientAuthFailure(claimsError)) {
    const retried = await supabase.auth.getClaims();
    claimsData = retried.data;
    claimsError = retried.error;
  }
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  // A transient Auth outage must not erase a valid-looking local session. RLS
  // still protects every data request made by the destination page.
  const isAuthenticated = (!claimsError && Boolean(claimsData?.claims?.sub)) || (hasAuthCookie && transientAuthFailure(claimsError));
  const pathname = request.nextUrl.pathname;
  const nextPath = `${pathname}${request.nextUrl.search}`;

  if (claimsError && hasAuthCookie) {
    console.warn("Auth session validation failed", {
      code: claimsError.code,
      status: claimsError.status,
      path: pathname,
    });
  }

  const isJoinPage = pathname === "/join" || pathname.startsWith("/join/");
  if (isJoinPage && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("mode", "signup");
    loginUrl.searchParams.set("next", nextPath);
    return copyAuthState(response, NextResponse.redirect(loginUrl));
  }

  if (isProtectedPage(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextPath);
    return copyAuthState(response, NextResponse.redirect(loginUrl));
  }

  if (pathname === "/login" && isAuthenticated) {
    const destination = safeInternalPath(request.nextUrl.searchParams.get("next"));
    return copyAuthState(response, NextResponse.redirect(new URL(destination, request.url)));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
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

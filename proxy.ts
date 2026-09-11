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

  const pathname = request.nextUrl.pathname;
  const nextPath = `${pathname}${request.nextUrl.search}`;
  const isJoinPage = pathname === "/join" || pathname.startsWith("/join/");

  // Reading a healthy cookie session is local and avoids putting a second
  // Supabase round trip in front of every authenticated page request. This is
  // only a routing hint: every page RPC is still authorized by Supabase RLS.
  // Login and invite entry points continue to verify claims before redirecting.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const hasSessionHint = !sessionError && Boolean(sessionData.session?.user?.id);
  const mustVerifyClaims = pathname === "/login" || isJoinPage || !hasSessionHint;
  let claimsData: Awaited<ReturnType<typeof supabase.auth.getClaims>>["data"] | null = null;
  let claimsError: Awaited<ReturnType<typeof supabase.auth.getClaims>>["error"] | null = null;

  if (mustVerifyClaims) {
    const claimsResult = await supabase.auth.getClaims();
    claimsData = claimsResult.data;
    claimsError = claimsResult.error;
  }
  const transientAuthFailure = (error: typeof claimsError) => Boolean(error && (
    Number(error.status ?? 0) >= 500
    || /fetch|network|timeout|connection/i.test(error.message)
  ));
  if (mustVerifyClaims && transientAuthFailure(claimsError)) {
    const retried = await supabase.auth.getClaims();
    claimsData = retried.data;
    claimsError = retried.error;
  }
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));
  // A transient Auth outage must not erase a valid-looking local session. RLS
  // still protects every data request made by the destination page.
  const hasVerifiedClaims = mustVerifyClaims && !claimsError && Boolean(claimsData?.claims?.sub);
  const isAuthenticated = hasSessionHint || hasVerifiedClaims || (hasAuthCookie && transientAuthFailure(claimsError));

  if (claimsError && hasAuthCookie) {
    console.warn("Auth session validation failed", {
      code: claimsError.code,
      status: claimsError.status,
      path: pathname,
    });
  }

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

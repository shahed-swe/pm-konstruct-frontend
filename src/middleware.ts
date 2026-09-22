/**
 * The first gate: no session cookie, no application page.
 *
 * This is a cheap redirect, not an authorisation check. It cannot tell a
 * valid session from an expired one -- the cookie is signed and opaque, and
 * verifying it here would mean either sharing the signing key with the web
 * tier or an API round trip on every navigation. The real decision is made
 * by the API on each request and by the server-side guards on each page.
 *
 * What it buys is that a signed-out visitor typing `/dashboard` gets the
 * login page immediately rather than a shell that renders, fetches, fails and
 * then redirects.
 */
import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "pmk_access";

/** Pages a signed-out visitor is allowed to see. */
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/setup",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(ACCESS_COOKIE);

  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Where they were headed, so signing in finishes the journey rather than
    // dumping everyone on the dashboard.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // A signed-in user on the marketing or auth pages belongs in the app. The
  // legacy's `GuestRoute` did the same, and without it the "Log in" link in
  // an old email takes an already-signed-in supervisor to a login form.
  if (signedIn && (pathname === "/login" || pathname === "/register" || pathname === "/pricing")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except the API proxy, Next's own assets and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};

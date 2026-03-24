import { NextResponse, type NextRequest } from "next/server";

const GUEST_ROUTES = ["/login", "/register"];
const PRIVATE_ROUTES = ["/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has("access_token");

  // Logged-in users trying to access guest-only pages → dashboard
  if (hasToken && GUEST_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Non-authenticated users trying to access private pages → login
  if (!hasToken && PRIVATE_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};

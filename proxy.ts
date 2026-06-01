import { NextResponse, type NextRequest } from "next/server";

import { getUserFromProxy } from "@/lib/auth";

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const user = await getUserFromProxy(request, response);

  if (user) {
    return response;
  }

  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard",
    "/generate",
    "/results/:path*",
    "/api/campaigns",
    "/api/strategy",
    "/api/strategy/stream",
    "/api/generate",
    "/api/assist",
    "/api/ideas",
    "/api/extract-url",
    "/api/brands",
    "/api/brands/:path*",
    "/brands",
  ],
};

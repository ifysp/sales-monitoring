import { NextResponse, type NextRequest } from "next/server";

// Pemeriksaan cepat: tanpa cookie sesi → arahkan ke /login.
// Verifikasi sesi yang sebenarnya dilakukan di lib/auth.ts.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("swit_session");
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

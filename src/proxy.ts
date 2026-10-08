import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista (só cookie). A autorização de verdade é feita em cada
// página/ação via exigirSessao().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*"],
};

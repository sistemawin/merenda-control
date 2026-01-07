import { NextResponse } from "next/server";

export function middleware(req) {
  const auth = req.cookies.get("auth");

  const protegido =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/pdv") ||
    req.nextUrl.pathname.startsWith("/produtos") ||
    req.nextUrl.pathname.startsWith("/movimentos") ||
    req.nextUrl.pathname.startsWith("/despesas");

  if (protegido && !auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

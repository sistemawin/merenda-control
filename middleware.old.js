import { NextResponse } from "next/server";

export function middleware(req) {
  return NextResponse.next();
}

// Se quiser proteger rotas depois, a gente ativa matcher aqui.
export const config = {
  matcher: [],
};
import { NextResponse, type NextRequest } from "next/server"

/** Drop a session the server could not validate, then show the sign-in page. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url))
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 })
    }
  }
  return response
}

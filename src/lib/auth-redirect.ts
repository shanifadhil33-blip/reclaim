export const RETIRED_PATHS = ["/billing", "/pricing", "/subscribe", "/dashboard/billing"]

export type AuthRedirect =
  | { action: "next" }
  | { action: "redirect"; pathname: string; search: string; stayHome: boolean }

/**
 * Signed-in means a validated user, not the presence of an auth cookie.
 * Retired billing URLs always stop at /, including for a signed-in user.
 */
export function decideAuthRedirect(input: {
  pathname: string
  hasUser: boolean
  stayHome: boolean
}): AuthRedirect {
  if (RETIRED_PATHS.includes(input.pathname)) {
    return { action: "redirect", pathname: "/", search: "", stayHome: true }
  }

  const isProtected = input.pathname.startsWith("/dashboard")
  const isLogin = input.pathname === "/login" || input.pathname.startsWith("/login/")

  if (!input.hasUser && isProtected) {
    return {
      action: "redirect",
      pathname: "/login",
      search: `?next=${encodeURIComponent(input.pathname)}`,
      stayHome: false,
    }
  }

  if (input.hasUser && isLogin) {
    return { action: "redirect", pathname: "/dashboard", search: "", stayHome: false }
  }

  if (input.pathname === "/" && input.stayHome) {
    return { action: "next" }
  }

  if (input.hasUser && input.pathname === "/") {
    return { action: "redirect", pathname: "/dashboard", search: "", stayHome: false }
  }

  return { action: "next" }
}

/**
 * lib/route-access.ts
 *
 * Central, single-source-of-truth map of which roles may access which pages.
 * This mirrors the role gating used by the sidebar navigation, but is enforced
 * at the page level (in ProtectedRoute) so that a user cannot stay on a page
 * their current role is not allowed to see — e.g. after their role is changed
 * from "warehouse" to "storage", refreshing/navigating re-evaluates access and
 * redirects them away.
 *
 * Rules:
 *   - 'supervisor' can access everything (handled in canAccessPath).
 *   - A path listed here is restricted to the listed roles.
 *   - A path NOT listed here is available to any authenticated user that has a
 *     role (Dashboard, checkpoints, locator, transmission, reports, settings…).
 */

export const ROUTE_ROLE_MAP: Record<string, string[]> = {
  '/warehouse': ['warehouse', 'inventory'],
  '/inventory': ['inventory'],
  '/cut': ['cut'],
  '/endorsement': ['endorsement'],
  '/scan': ['scan'],
}

/**
 * Returns the roles allowed for a given path, or null when the path is
 * unrestricted (any authenticated role may access it).
 * The most specific (longest) matching prefix wins.
 */
export function getAllowedRolesForPath(pathname: string): string[] | null {
  const match = Object.keys(ROUTE_ROLE_MAP)
    .filter((base) => pathname === base || pathname.startsWith(`${base}/`))
    .sort((a, b) => b.length - a.length)[0]
  return match ? ROUTE_ROLE_MAP[match] : null
}

/**
 * Authoritative client-side access check for a page.
 * NOTE: This is a UX guard only. The backend remains the real authority and
 * independently enforces authorization on every API call.
 */
export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false
  if (role === 'supervisor') return true
  const allowed = getAllowedRolesForPath(pathname)
  if (!allowed) return true // unrestricted page
  return allowed.includes(role)
}

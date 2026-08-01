import { ProtectedRoute } from "@/components/protected-route"

// The QR/ISBN scanner reads live box and book records, so it is wrapped in the
// same guard as the other feature pages. Without this layout the page rendered
// for any account holding a session cookie, including users whose role has not
// been approved yet.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

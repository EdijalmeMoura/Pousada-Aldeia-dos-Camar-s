import { Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "./ui/skeleton"
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="mx-auto max-w-7xl space-y-4 p-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_concluido) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

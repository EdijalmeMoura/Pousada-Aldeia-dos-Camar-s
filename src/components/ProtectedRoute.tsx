import { Navigate } from "react-router-dom"
import type { ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Skeleton } from "./ui/skeleton"
import { authDestination } from "@/lib/authRouting"
export function ProtectedRoute({ children, onboarding = false }: { children: ReactNode; onboarding?: boolean }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="mx-auto max-w-7xl space-y-4 p-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>
  const destination = authDestination(Boolean(user), profile?.onboarding_concluido, onboarding)
  if (destination) return <Navigate to={destination} replace />
  return <>{children}</>
}

import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/hooks/useAuth"
import { AppLayout } from "@/components/AppLayout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "@/components/Toaster"
import { Skeleton } from "@/components/ui/skeleton"

const Landing = lazy(() => import("@/pages/Landing"))
const Login = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Login })))
const Signup = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Signup })))
const Onboarding = lazy(() => import("@/pages/Onboarding"))
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const Quartos = lazy(() => import("@/pages/Quartos"))
const Calendario = lazy(() => import("@/pages/Calendario"))
const Reservas = lazy(() => import("@/pages/Reservas"))
const Checkin = lazy(() => import("@/pages/Checkin"))
const Configuracoes = lazy(() => import("@/pages/Configuracoes"))
const PublicBooking = lazy(() => import("@/pages/PublicBooking"))
const Privacidade = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Privacidade })))
const Termos = lazy(() => import("@/pages/Legal").then((m) => ({ default: m.Termos })))
const NotFound = lazy(() => import("@/pages/NotFound"))

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

function Fallback() {
  return <div className="mx-auto max-w-7xl space-y-4 p-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<Fallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="quartos" element={<Quartos />} />
                  <Route path="reservas" element={<Reservas />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="checkin" element={<Checkin />} />
                </Route>
                <Route path="/configuracoes" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Configuracoes />} />
                </Route>
                <Route path="/:slug" element={<PublicBooking />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

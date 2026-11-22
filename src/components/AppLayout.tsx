import { BrandMark } from "@/components/BrandMark"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { BedDouble, CalendarCheck, CalendarDays, LayoutDashboard, LogOut, Menu, MessageSquareText, Settings, X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { ThemeToggle } from "./ThemeToggle"
import { cn } from "@/lib/utils"

const links = [
  { to: "/app", label: "Painel", icon: LayoutDashboard },
  { to: "/app/quartos", label: "Quartos e tarifas", icon: BedDouble },
  { to: "/app/reservas", label: "Reservas", icon: CalendarCheck },
  { to: "/app/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/app/checkin", label: "Check-in IA", icon: MessageSquareText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.to === "/app"} onClick={() => setOpen(false)}
          className={({ isActive }) => cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]", isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-accent")}>
          <l.icon className="h-4 w-4" />{l.label}
        </NavLink>
      ))}
    </nav>
  )
  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-accent lg:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            <Link to="/app" className="flex items-center gap-2 font-bold tracking-tight">
              <BrandMark />
              <span className="hidden sm:inline">{profile?.nome_pousada || "Hospedaê"}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8 ring-2 ring-primary/30"><AvatarFallback className="bg-accent font-semibold text-primary">{(profile?.nome ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
            <span className="hidden text-sm text-muted-foreground md:inline">{profile?.nome}</span>
            <Button variant="ghost" size="sm" aria-label="Sair" onClick={async () => { await signOut(); navigate("/") }}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        {open && <div className="border-t p-4 lg:hidden">{nav}</div>}
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r bg-card/50 p-4 lg:block print:hidden">{nav}</aside>
        <main className="min-w-0 flex-1 p-4 md:p-6 print:p-0"><Outlet /></main>
      </div>
    </div>
  )
}

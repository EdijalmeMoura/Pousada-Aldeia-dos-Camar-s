import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { getProfile, newProfile, saveProfile, type Profile } from "@/lib/db"
import { isPhpBackend } from "@/lib/phpBackend"
import { phpSession, phpWrite, clearPhpSession, type PhpAccount } from "@/lib/phpAuth"
import { hashDemoPassword, verifyDemoPassword, type DemoAccount } from "@/lib/demoCredentials"

interface User { id: string; email: string; nome?: string }
interface AuthCtx {
  user: User | null; profile: Profile | null; loading: boolean
  signUp: (email: string, password: string, nome: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
const Ctx = createContext<AuthCtx | null>(null)
const LS_USER = "pousada_user_v1"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const setPhpAccount = (account: PhpAccount | null) => {
    if (!account) { setUser(null); setProfile(null); return }
    setUser({ id: account.id, email: account.email, nome: account.nome_pousada })
    setProfile({ ...newProfile({ id: account.id, email: account.email, nome: account.nome_pousada }),
      nome_pousada: account.nome_pousada, slug: account.slug, onboarding_concluido: true })
  }

  const loadProfile = async (u: User) => {
    let p = await getProfile(u.id)
    if (!p) { p = newProfile(u); await saveProfile(p) }
    setProfile(p)
  }

  useEffect(() => {
    if (!isPhpBackend) return
    const revoke = () => { clearPhpSession(); queryClient.clear(); setPhpAccount(null) }
    window.addEventListener("hospedae:php-unauthorized", revoke)
    return () => window.removeEventListener("hospedae:php-unauthorized", revoke)
  }, [queryClient])

  useEffect(() => {
    ;(async () => {
      if (isPhpBackend) {
        try { setPhpAccount(await phpSession()) }
        catch { setPhpAccount(null) }
      } else if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession()
        const u = data.session?.user
        if (u) { const usr = { id: u.id, email: u.email!, nome: u.user_metadata?.nome }; setUser(usr); await loadProfile(usr) }
        supabase.auth.onAuthStateChange(async (_e, session) => {
          const uu = session?.user
          if (uu) { const usr = { id: uu.id, email: uu.email!, nome: uu.user_metadata?.nome }; setUser(usr); await loadProfile(usr) }
          else { setUser(null); setProfile(null) }
        })
      } else {
        const raw = localStorage.getItem(LS_USER)
        if (raw) { const u = JSON.parse(raw) as User; setUser(u); await loadProfile(u) }
      }
      setLoading(false)
    })()
  }, [])

  const signUp = async (email: string, password: string, nome: string) => {
    if (isPhpBackend) {
      const result = await phpWrite<{ account: PhpAccount }>("register", { email, password, nome_pousada: nome })
      queryClient.clear()
      setPhpAccount(result.account)
      return true
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nome } } })
      if (error) throw error
      if (!data.session) return false // confirmação por e-mail: sem sessão não há acesso ao perfil/RLS
      if (data.user) { const u = { id: data.user.id, email, nome }; setUser(u); await loadProfile(u) }
      return true
    }
    const users = JSON.parse(localStorage.getItem("pousada_users_v1") ?? "[]") as DemoAccount[]
    if (users.some((x) => x.email === email)) throw new Error("Já existe uma conta com este e-mail. Faça login.")
    const u = { id: crypto.randomUUID(), email, nome, ...(await hashDemoPassword(password)) }
    users.push(u); localStorage.setItem("pousada_users_v1", JSON.stringify(users))
    localStorage.setItem(LS_USER, JSON.stringify({ id: u.id, email, nome }))
    setUser({ id: u.id, email, nome }); await loadProfile({ id: u.id, email, nome })
    return true
  }

  const signIn = async (email: string, password: string) => {
    if (isPhpBackend) {
      const result = await phpWrite<{ account: PhpAccount }>("login", { email, password })
      queryClient.clear()
      setPhpAccount(result.account)
      return
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) { const u = { id: data.user.id, email, nome: data.user.user_metadata?.nome }; setUser(u); await loadProfile(u) }
      return
    }
    const users = JSON.parse(localStorage.getItem("pousada_users_v1") ?? "[]") as DemoAccount[]
    const found = users.find((x) => x.email === email)
    if (!found || !await verifyDemoPassword(found, password)) throw new Error("E-mail ou palavra-passe incorretos. Verifique e tente novamente.")
    if (found.password !== undefined) {
      users[users.indexOf(found)] = { id: found.id, email: found.email, nome: found.nome, ...(await hashDemoPassword(password)) }
      localStorage.setItem("pousada_users_v1", JSON.stringify(users))
    }
    localStorage.setItem(LS_USER, JSON.stringify({ id: found.id, email, nome: found.nome }))
    setUser({ id: found.id, email, nome: found.nome }); await loadProfile({ id: found.id, email, nome: found.nome })
  }

  const signInGoogle = async () => {
    if (isPhpBackend) throw new Error("Entrada Google indisponível no backend PHP.")
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL(`${import.meta.env.BASE_URL}onboarding`, location.origin).href } })
      if (error) throw error
      return
    }
    // Modo local: conta demo instantânea
    const demo = { id: "demo-google", email: "demo@pousada.pt", nome: "Anfitrião Demo" }
    localStorage.setItem(LS_USER, JSON.stringify(demo))
    setUser(demo); await loadProfile(demo)
  }

  const signOut = async () => {
    if (isPhpBackend) {
      await phpWrite("logout", {})
      clearPhpSession()
      queryClient.clear()
      setPhpAccount(null)
      return
    }
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut()
    localStorage.removeItem(LS_USER)
    setUser(null); setProfile(null)
  }

  const refreshProfile = async () => { if (isPhpBackend) { setPhpAccount(await phpSession()); return }; if (user) await loadProfile(user) }

  return <Ctx.Provider value={{ user, profile, loading, signUp, signIn, signInGoogle, signOut, refreshProfile }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAuth fora do AuthProvider")
  return ctx
}

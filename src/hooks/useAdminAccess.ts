import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

/** A visibilidade do separador usa a role real no Supabase. No modo local, só a conta demo vê a pré-visualização. */
export function useAdminAccess() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return false
      if (!isSupabaseConfigured || !supabase) return user.id === "demo-google"
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      if (error) throw error
      return data?.role === "admin"
    },
  })
}

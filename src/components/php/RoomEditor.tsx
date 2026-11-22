import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { phpWrite } from "@/lib/phpAuth"
import { brl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Room = { id: string; nome: string; capacidade: number; preco_base: number; ativo: number | boolean }
export function RoomEditor({ room }: { room: Room }) {
  const qc = useQueryClient()
  const [name, setName] = useState(room.nome)
  const [capacity, setCapacity] = useState(room.capacidade)
  const [price, setPrice] = useState(String(room.preco_base))
  const [active, setActive] = useState(Boolean(Number(room.ativo)))
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setName(room.nome); setCapacity(room.capacidade); setPrice(String(room.preco_base)); setActive(Boolean(Number(room.ativo)))
  }, [room.nome, room.capacidade, room.preco_base, room.ativo])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await phpWrite("update-room", { id: room.id, nome: name.trim(), capacidade: Number(capacity), preco_base_centavos: Math.round(Number(price) * 100), ativo: active })
      await qc.invalidateQueries({ queryKey: ["php-rooms"] }); setEditing(false); toast.success("Quarto atualizado; reservas existentes mantêm o preço acordado")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar o quarto") }
    finally { setBusy(false) }
  }
  return <li className="rounded-lg border p-3 text-sm">
    {!editing ? <div className="flex flex-wrap items-center justify-between gap-2"><span>{room.nome} · {room.capacidade} pessoas · {brl(Number(room.preco_base))}/noite · {Boolean(Number(room.ativo)) ? "Ativo" : "Inativo"}</span><Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button></div> :
      <form onSubmit={save} className="space-y-2">
        <Label htmlFor={`name-${room.id}`}>Nome</Label><Input id={`name-${room.id}`} required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} />
        <Label htmlFor={`capacity-${room.id}`}>Capacidade</Label><Input id={`capacity-${room.id}`} type="number" required min={1} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
        <Label htmlFor={`price-${room.id}`}>Preço por noite (R$)</Label><Input id={`price-${room.id}`} type="number" required min="1" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Quarto ativo para novas reservas</label>
        <p className="text-xs text-muted-foreground">Desativar impede novas reservas; não cancela as existentes. Alterar o preço não muda reservas já criadas.</p>
        <div className="flex gap-2"><Button disabled={busy}>Guardar</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Fechar</Button></div>
      </form>}
  </li>
}

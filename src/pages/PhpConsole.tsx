import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PaymentSettings } from "@/components/php/PaymentSettings"
import { OperationalSummary } from "@/components/php/OperationalSummary"
import { BookingList } from "@/components/php/BookingList"
import { PasswordSettings } from "@/components/php/PasswordSettings"
import { RoomEditor } from "@/components/php/RoomEditor"
import { PousadaSettings } from "@/components/php/PousadaSettings"
import { CalendarOperations } from "@/components/php/CalendarOperations"
import { useAuth } from "@/hooks/useAuth"
import { phpRequest } from "@/lib/phpBackend"
import { phpWrite } from "@/lib/phpAuth"
import type { PhpBooking } from "@/lib/phpBookingOperations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Room = { id: string; nome: string; capacidade: number; preco_base: number; ativo: number | boolean }

export default function PhpConsole() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const rooms = useQuery({ queryKey: ["php-rooms"], queryFn: () => phpRequest<Room[]>("my-rooms") })
  const bookings = useQuery({ queryKey: ["php-bookings"], queryFn: () => phpRequest<PhpBooking[]>("my-bookings") })
  const [busy, setBusy] = useState(false)
  const [room, setRoom] = useState({ nome: "", capacidade: 2, preco_base: "" })
  const [booking, setBooking] = useState({ quarto_id: "", nome_hospede: "", email: "", telefone: "", check_in: "", check_out: "", adultos: 2, metodo_pagamento: "pix" })
  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await phpWrite("add-room", { ...room, capacidade: Number(room.capacidade), preco_base_centavos: Math.round(Number(room.preco_base) * 100) })
      setRoom({ nome: "", capacidade: 2, preco_base: "" }); await qc.invalidateQueries({ queryKey: ["php-rooms"] }); toast.success("Quarto registado")
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar o quarto") }
    finally { setBusy(false) }
  }
  const createBooking = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await phpWrite("add-booking", booking)
      await qc.invalidateQueries({ queryKey: ["php-bookings"] }); await qc.invalidateQueries({ queryKey: ["php-summary"] }); toast.success("Reserva registada")
      setBooking({ ...booking, nome_hospede: "", email: "", telefone: "", check_in: "", check_out: "" })
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a reserva") }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{profile?.nome_pousada}</h1><p className="text-sm text-muted-foreground">Gestão PHP em ensaio · sem cobrança integrada</p></div><Button variant="outline" onClick={async () => { try { await signOut(); navigate("/login") } catch { toast.error("Não foi possível terminar a sessão") } }}>Sair</Button></header>
    <p role="status" className="rounded-xl border bg-accent p-4 text-sm">Este painel reduzido ainda não substitui as funcionalidades antigas. Não cobre tarifas sazonais, pagamentos ou check-in. Não use dados reais antes dos testes no alojamento.</p>
    <OperationalSummary />
    <PousadaSettings />
    <PaymentSettings />
    <PasswordSettings />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Quartos</CardTitle></CardHeader><CardContent className="space-y-4">
        <form onSubmit={createRoom} className="space-y-3"><Label htmlFor="room-name">Nome</Label><Input id="room-name" required minLength={2} maxLength={160} value={room.nome} onChange={e => setRoom({ ...room, nome: e.target.value })} /><Label htmlFor="capacity">Capacidade</Label><Input id="capacity" type="number" min={1} max={50} required value={room.capacidade} onChange={e => setRoom({ ...room, capacidade: Number(e.target.value) })} /><Label htmlFor="price">Preço por noite (R$)</Label><Input id="price" type="number" min="1" step="0.01" required value={room.preco_base} onChange={e => setRoom({ ...room, preco_base: e.target.value })} /><Button disabled={busy}>Adicionar quarto</Button></form>
        {rooms.isError && <p role="alert">Não foi possível carregar os quartos. <Button variant="link" onClick={() => rooms.refetch()}>Tentar novamente</Button></p>}
        <ul className="space-y-2">{rooms.data?.map(r => <RoomEditor key={r.id} room={r} />)}</ul>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Reserva manual</CardTitle></CardHeader><CardContent className="space-y-4">
        <form onSubmit={createBooking} className="space-y-3">
          <Label htmlFor="room">Quarto</Label><select id="room" required className="flex h-10 w-full rounded-md border bg-background px-3" value={booking.quarto_id} onChange={e => setBooking({ ...booking, quarto_id: e.target.value })}><option value="">Escolha um quarto</option>{rooms.data?.filter(r => Boolean(Number(r.ativo))).map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
          {([['nome_hospede', 'Nome do hóspede'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['check_in', 'Entrada'], ['check_out', 'Saída']] as const).map(([key, label]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} required type={key === 'email' ? 'email' : key.startsWith('check_') ? 'date' : 'text'} value={booking[key]} onChange={e => setBooking({ ...booking, [key]: e.target.value })} /></div>)}
          <Label htmlFor="adults">Adultos</Label><Input id="adults" type="number" min={1} max={50} required value={booking.adultos} onChange={e => setBooking({ ...booking, adultos: Number(e.target.value) })} />
          <p className="text-xs text-muted-foreground">Pagamento a combinar diretamente com a pousada; a reserva não confirma qualquer cobrança.</p><Button disabled={busy || !rooms.data?.length}>Registar reserva</Button>
        </form>
        {bookings.isError && <p role="alert">Não foi possível carregar as reservas. <Button variant="link" onClick={() => bookings.refetch()}>Tentar novamente</Button></p>}
      </CardContent></Card>
    </div>
    <CalendarOperations rooms={rooms.data ?? []} bookings={bookings.data ?? []} />
    <BookingList bookings={bookings.data ?? []} rooms={rooms.data ?? []} pousada={profile?.nome_pousada ?? ""} />
  </main>
}

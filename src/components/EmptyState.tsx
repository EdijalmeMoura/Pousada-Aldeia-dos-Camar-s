import type { LucideIcon } from "lucide-react"
import { Button } from "./ui/button"
interface Props { icon: LucideIcon; titulo: string; subtitulo: string; cta?: string; onCta?: () => void }
export function EmptyState({ icon: Icon, titulo, subtitulo, cta, onCta }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="h-8 w-8" /></div>
      <h3 className="text-base font-semibold">{titulo}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{subtitulo}</p>
      {cta && onCta && <Button onClick={onCta} className="mt-2">{cta}</Button>}
    </div>
  )
}

import { cn } from "@/lib/utils"

/** Símbolo vetorial da Hospedaê, consistente em todos os pontos de contacto. */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/images/icon-hospedae.svg" alt="" aria-hidden="true" className={cn("h-8 w-8 shrink-0 object-contain", className)} />
}

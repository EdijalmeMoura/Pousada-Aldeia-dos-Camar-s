import { cn } from "@/lib/utils"

/** Símbolo vetorial da Hospedaê, consistente em todos os pontos de contacto. */
export function BrandMark({ className }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}images/icon-hospedae.png`} alt="" aria-hidden="true" className={cn("h-8 w-8 shrink-0 object-contain", className)} />
}

import { useEffect, useState } from "react"
import { BedDouble } from "lucide-react"

/** Uma fotografia ausente ou inválida não é substituída por uma imagem inventada. */
export function RoomPhoto({ src, name, className = "h-48" }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return src && !failed
    ? <img src={src} alt={`Fotografia de ${name}`} loading="lazy" onError={() => setFailed(true)} className={`w-full object-cover ${className}`} />
    : <div role="img" aria-label={`${name}: fotografia ainda não disponível`} className={`flex w-full items-center justify-center bg-accent text-primary ${className}`}><span className="flex flex-col items-center gap-2"><BedDouble className="h-10 w-10" /><span className="text-sm">Fotografia indisponível</span></span></div>
}

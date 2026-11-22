/** PHP vive na mesma origem e subpasta que o frontend; nunca chamar localhost no navegador. */
export const isPhpBackend = import.meta.env.VITE_BACKEND === "php"

export async function phpRequest<T>(action: string, params: Record<string, string> = {}, body?: unknown, csrf?: string): Promise<T> {
  const url = new URL(`${import.meta.env.BASE_URL}api/index.php`, location.origin)
  url.searchParams.set("action", action)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
    credentials: "same-origin",
    cache: "no-store",
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let result: unknown
  try { result = await response.json() } catch { throw new Error("O servidor de reservas não respondeu corretamente.") }
  if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("hospedae:php-unauthorized"))
  if (!response.ok) {
    const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
      ? result.error : "Não foi possível contactar o servidor de reservas."
    throw new Error(message)
  }
  return result as T
}

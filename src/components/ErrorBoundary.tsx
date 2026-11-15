import { Component, type ReactNode } from "react"
import { Button } from "./ui/button"
interface Props { children: ReactNode }
interface State { hasError: boolean }
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-bold">Algo correu mal por aqui</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Lamentamos o inconveniente. Tente recarregar a página — os seus dados estão guardados em segurança.</p>
          <Button onClick={() => location.reload()}>Recarregar página</Button>
        </div>
      )
    }
    return this.props.children
  }
}

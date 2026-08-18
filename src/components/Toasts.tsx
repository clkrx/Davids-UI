import { CheckCircle2, CircleAlert, Info } from 'lucide-react'
import { useApp } from '../state/store'

export function Toasts() {
  const { state } = useApp()
  if (state.toasts.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'error' ? (
            <CircleAlert size={15} color="var(--red)" />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={15} color="var(--green)" />
          ) : (
            <Info size={15} color="var(--accent)" />
          )}
          {t.text}
        </div>
      ))}
    </div>
  )
}

import { useVault } from '../context/VaultContext'

export function ToastStack() {
  const { toasts } = useVault()
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="ico">{t.icon}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

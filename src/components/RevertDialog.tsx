import { useEffect, useState } from 'react'
import { Loader2, Undo2 } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../state/store'
import { formatTime } from '../utils'

/**
 * Confirmation dialog for reverting a change log entry. Only marks the entry
 * reverted after the backend confirms; failures are reported honestly.
 */
export function RevertDialog() {
  const { state, dispatch, toast } = useApp()
  const [busy, setBusy] = useState(false)
  const target = state.revertTarget

  const ws = target ? state.workspaces.find((w) => w.id === target.workspaceId) : undefined
  const entry = target && ws ? ws.changes.find((c) => c.id === target.changeId) : undefined

  const close = () => dispatch({ type: 'revert-target', target: null })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!target || !ws || !entry) return null

  const confirm = () => {
    setBusy(true)
    api
      .revertChange(ws.id, entry.id)
      .then(() => {
        dispatch({
          type: 'change-patch',
          wsId: ws.id,
          changeId: entry.id,
          patch: { status: 'reverted' },
        })
        toast('success', `Reverted “${entry.summary}” — Fusion confirmed the restore.`)
        setBusy(false)
        close()
      })
      .catch(() => {
        setBusy(false)
        toast(
          'error',
          'Revert failed — the Fusion backend did not confirm. Nothing was changed.',
        )
      })
  }

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm revert"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <Undo2 size={18} color="var(--amber)" />
          Revert this operation?
        </div>

        <div className="modal-section">
          <h4>What will change</h4>
          <p>
            Reverting “{entry.summary}” will restore the previous state of{' '}
            <strong>{entry.component}</strong> in {entry.workspaceName}.
          </p>
        </div>

        <div className="modal-section">
          <h4>Components affected</h4>
          <p>
            {entry.component}
            {entry.sku ? ` · VEX SKU ${entry.sku}` : ''}
          </p>
        </div>

        <div className="modal-section">
          <h4>State restored</h4>
          <p>
            The workspace returns to the state recorded before {formatTime(entry.ts)}. Later
            operations in the change log are not removed.
          </p>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={confirm} disabled={busy}>
            {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Revert operation
          </button>
        </div>
      </div>
    </div>
  )
}

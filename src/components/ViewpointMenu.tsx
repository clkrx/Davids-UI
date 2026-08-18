import { useEffect, useRef, useState } from 'react'
import { Camera, Check, ChevronDown, TriangleAlert } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../state/store'
import { VIEWPOINTS, viewpointLabel, type ViewpointId, type WorkspaceState } from '../types'

interface Props {
  workspace: WorkspaceState
  /** 'up' opens above the trigger (viewport bottom bar). */
  direction?: 'down' | 'up'
  /** Compact trigger for the viewport control bar. */
  compact?: boolean
}

export function ViewpointMenu({ workspace, direction = 'down', compact = false }: Props) {
  const { state, dispatch, toast } = useApp()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const unavailable = state.backend !== 'online'

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (vp: ViewpointId) => {
    if (unavailable) {
      toast('error', 'Viewpoint control unavailable — the Fusion backend is offline.')
      return
    }
    api
      .setViewpoint(workspace.id, vp)
      .then(() => {
        dispatch({ type: 'ws', id: workspace.id, patch: { viewpoint: vp } })
        setOpen(false)
      })
      .catch(() => {
        toast('error', 'Viewpoint request failed — Fusion did not confirm the camera change.')
      })
  }

  return (
    <div className="menu-anchor" ref={rootRef}>
      {compact ? (
        <button
          type="button"
          className="icon-btn"
          aria-label="Viewpoint menu"
          aria-expanded={open}
          title="Viewpoint"
          onClick={() => setOpen((v) => !v)}
        >
          <Camera size={16} />
        </button>
      ) : (
        <button
          type="button"
          className="chip"
          style={{ cursor: 'pointer', fontFamily: 'inherit' }}
          aria-expanded={open}
          aria-label="Change viewpoint"
          onClick={() => setOpen((v) => !v)}
        >
          <Camera size={13} />
          {viewpointLabel(workspace.viewpoint)}
          <ChevronDown size={13} style={{ opacity: 0.6 }} />
        </button>
      )}

      {open && (
        <div className={`dropdown${direction === 'up' ? ' up' : ''}`} role="menu">
          {VIEWPOINTS.map((vp) => (
            <button
              key={vp.id}
              type="button"
              role="menuitemradio"
              aria-checked={workspace.viewpoint === vp.id}
              className={`menu-item${workspace.viewpoint === vp.id ? ' selected' : ''}`}
              disabled={unavailable}
              onClick={() => select(vp.id)}
            >
              {vp.label}
              {workspace.viewpoint === vp.id && <Check size={14} className="check" />}
            </button>
          ))}
          {unavailable && (
            <div className="menu-note">
              <TriangleAlert size={13} />
              Viewpoint control unavailable — backend offline
            </div>
          )}
        </div>
      )}
    </div>
  )
}

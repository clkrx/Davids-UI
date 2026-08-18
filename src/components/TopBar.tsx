import {
  Download,
  History,
  Maximize2,
  MessageSquare,
  Orbit,
  Users,
} from 'lucide-react'
import { useApp } from '../state/store'
import { ViewpointMenu } from './ViewpointMenu'

function toggleViewportFullscreen() {
  const el = document.getElementById('fusion-viewport')
  if (!el) return
  if (document.fullscreenElement) {
    void document.exitFullscreen()
  } else {
    void el.requestFullscreen().catch(() => {})
  }
}

export function TopBar() {
  const { state, dispatch, active } = useApp()
  const live = active.streamState === 'live'

  const fusionLabel =
    state.backend === 'online'
      ? 'Fusion 360 connected'
      : state.backend === 'checking'
        ? 'Checking Fusion 360…'
        : 'Fusion 360 offline'

  return (
    <header className="topbar">
      <div className="wordmark">
        <div className="wordmark-tile">
          <Orbit size={17} />
        </div>
        <span>Fenwick CAD Control</span>
      </div>

      <div className="topbar-divider" />

      <div className="chip hide-sm" title="Fusion 360 connection">
        <span
          className={`dot ${
            state.backend === 'online'
              ? 'green'
              : state.backend === 'checking'
                ? 'amber'
                : 'red'
          }`}
        />
        {fusionLabel}
      </div>

      <span className="topbar-ws-name" title={active.name}>
        {active.name}
      </span>

      {live ? (
        <span className="live-badge on">
          <span className="dot cyan" />
          LIVE
        </span>
      ) : (
        <span className="live-badge off">Stream offline</span>
      )}

      <div className="chip hide-sm" title="Live viewers">
        <Users size={13} />
        {active.viewers} viewer{active.viewers === 1 ? '' : 's'}
      </div>

      <div className="topbar-spacer" />

      <ViewpointMenu workspace={active} />

      <div className="topbar-divider" />

      <div className="topbar-actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Toggle viewport fullscreen"
          title="Fullscreen"
          onClick={toggleViewportFullscreen}
        >
          <Maximize2 size={17} />
        </button>
        <button
          type="button"
          className={`icon-btn${state.chatOpen ? ' active' : ''}`}
          aria-label="Toggle Claude chat panel"
          title="Claude chat"
          onClick={() =>
            dispatch({ type: 'panel', key: 'chatOpen', value: !state.chatOpen })
          }
        >
          <MessageSquare size={17} />
        </button>
        <button
          type="button"
          className={`icon-btn${state.changeLogOpen ? ' active' : ''}`}
          aria-label="Open change log"
          title="Change log"
          onClick={() =>
            dispatch({ type: 'panel', key: 'changeLogOpen', value: !state.changeLogOpen })
          }
        >
          <History size={17} />
        </button>
        <button
          type="button"
          className={`icon-btn${state.artifactsOpen ? ' active' : ''}`}
          aria-label="Open artifacts and downloads"
          title="Artifacts"
          onClick={() =>
            dispatch({ type: 'panel', key: 'artifactsOpen', value: !state.artifactsOpen })
          }
        >
          <Download size={17} />
        </button>
      </div>
    </header>
  )
}

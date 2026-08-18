import { useEffect } from 'react'
import { api } from './api/client'
import { ArtifactsDrawer } from './components/ArtifactsDrawer'
import { ChangeLogDrawer } from './components/ChangeLogDrawer'
import { ChatPanel } from './components/ChatPanel'
import { FusionViewport } from './components/FusionViewport'
import { RevertDialog } from './components/RevertDialog'
import { SessionSettingsDialog } from './components/SessionSettingsDialog'
import { Toasts } from './components/Toasts'
import { TopBar } from './components/TopBar'
import { WorkspaceRail } from './components/WorkspaceRail'
import { useApp } from './state/store'

const HEALTH_POLL_MS = 12000

export default function App() {
  const { state, dispatch } = useApp()

  // Poll the local agent service; everything honest about connectivity keys
  // off this status.
  useEffect(() => {
    let alive = true
    const check = () => {
      api
        .health()
        .then(() => {
          if (alive) dispatch({ type: 'backend', status: 'online' })
        })
        .catch(() => {
          if (alive) dispatch({ type: 'backend', status: 'offline' })
        })
    }
    check()
    const t = window.setInterval(check, HEALTH_POLL_MS)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [dispatch])

  return (
    <div className="app">
      <TopBar />
      <div className="app-body">
        <WorkspaceRail />
        <main className="stage">
          <FusionViewport />
        </main>
        <ChatPanel />
      </div>

      {state.changeLogOpen && <ChangeLogDrawer />}
      {state.artifactsOpen && <ArtifactsDrawer />}
      {state.settingsOpen && <SessionSettingsDialog />}
      <RevertDialog />
      <Toasts />
    </div>
  )
}

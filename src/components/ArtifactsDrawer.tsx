import { useEffect, useState } from 'react'
import {
  Box,
  Camera,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Shapes,
  TriangleAlert,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../state/store'
import type { Artifact, ArtifactType } from '../types'
import { formatBytes, formatDateTime } from '../utils'

const TYPE_ICON: Record<ArtifactType, typeof Box> = {
  f3d: Box,
  step: Package,
  stl: Shapes,
  screenshot: Camera,
  render: ImageIcon,
  report: FileText,
  summary: ClipboardList,
}

const TYPE_LABEL: Record<ArtifactType, string> = {
  f3d: 'Fusion design',
  step: 'STEP',
  stl: 'STL',
  screenshot: 'Screenshot',
  render: 'Render',
  report: 'CAD report',
  summary: 'Change summary',
}

export function ArtifactsDrawer() {
  const { state, dispatch } = useApp()
  const close = () => dispatch({ type: 'panel', key: 'artifactsOpen', value: false })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const artifacts = state.workspaces
    .flatMap((w) => w.artifacts)
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer right" role="dialog" aria-modal="true" aria-label="Artifacts and downloads">
        <div className="drawer-header">
          <Download size={17} color="var(--accent)" />
          <div className="drawer-title">Artifacts & downloads</div>
          <button type="button" className="icon-btn" aria-label="Close artifacts" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {artifacts.length === 0 ? (
            <div className="drawer-empty">
              <Package size={24} />
              No artifacts yet. Exported Fusion files, screenshots, and reports will appear
              here once a session produces them.
            </div>
          ) : (
            artifacts.map((a) => <ArtifactRow key={a.id} artifact={a} />)
          )}
        </div>
      </aside>
      <PreviewModal />
    </>
  )
}

function ArtifactRow({ artifact: a }: { artifact: Artifact }) {
  const { state, dispatch } = useApp()
  const Icon = TYPE_ICON[a.type]
  const downloadable = a.status === 'ready' && state.backend === 'online'
  const previewable = a.type === 'screenshot' || a.type === 'render'

  return (
    <div className="artifact-row">
      <div className="artifact-icon">
        <Icon size={17} />
      </div>
      <div className="artifact-main">
        <div className="artifact-name">{a.name}</div>
        <div className="artifact-desc">{a.description}</div>
        <div className="artifact-meta">
          <span>{TYPE_LABEL[a.type]}</span>
          <span>{a.workspaceName}</span>
          <span>{formatDateTime(a.createdAt)}</span>
          <span>{formatBytes(a.sizeBytes)}</span>
        </div>
        <div className="artifact-actions">
          {a.status === 'exporting' ? (
            <>
              <button type="button" className="btn small" disabled>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Preparing…
              </button>
              <span className="artifact-note">
                <TriangleAlert size={12} />
                Download unavailable until Fusion finishes exporting.
              </span>
            </>
          ) : a.status === 'failed' ? (
            <span className="artifact-note">
              <TriangleAlert size={12} />
              Export failed — this artifact cannot be downloaded.
            </span>
          ) : downloadable ? (
            <a
              className="btn small primary"
              href={api.artifactDownloadUrl(a.id)}
              download={a.name}
            >
              <Download size={13} />
              Download
            </a>
          ) : (
            <>
              <button type="button" className="btn small" disabled>
                <Download size={13} />
                Download
              </button>
              <span className="artifact-note">
                <TriangleAlert size={12} />
                Backend offline — download unavailable.
              </span>
            </>
          )}
          {previewable && (
            <button
              type="button"
              className="btn small"
              onClick={() =>
                dispatch({
                  type: 'preview',
                  target: { workspaceId: a.workspaceId, artifactId: a.id },
                })
              }
            >
              <Eye size={13} />
              Preview
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewModal() {
  const { state, dispatch } = useApp()
  const [loadFailed, setLoadFailed] = useState(false)
  const target = state.previewArtifact

  const artifact =
    target &&
    state.workspaces
      .find((w) => w.id === target.workspaceId)
      ?.artifacts.find((a) => a.id === target.artifactId)

  useEffect(() => {
    setLoadFailed(false)
  }, [target?.artifactId])

  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'preview', target: null })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [target, dispatch])

  if (!target || !artifact) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => dispatch({ type: 'preview', target: null })}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${artifact.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <Eye size={17} color="var(--accent)" />
          {artifact.name}
        </div>
        <div className="preview-box">
          {loadFailed ? (
            <span>
              Preview unavailable — the file could not be loaded from the local service.
            </span>
          ) : (
            <img
              src={api.artifactDownloadUrl(artifact.id)}
              alt={artifact.description}
              onError={() => setLoadFailed(true)}
            />
          )}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: 'preview', target: null })}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

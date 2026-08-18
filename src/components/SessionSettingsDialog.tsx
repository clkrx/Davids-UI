import { useEffect, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useApp } from '../state/store'
import type { StreamKind, StreamQuality } from '../types'

/**
 * Per-workspace stream configuration. This is where a real Fusion capture
 * service gets connected: pick the protocol and point at its URL. Saved to
 * localStorage and applied immediately.
 */
export function SessionSettingsDialog() {
  const { state, dispatch, active: ws, toast } = useApp()
  const [kind, setKind] = useState<StreamKind>(ws.stream.kind)
  const [url, setUrl] = useState(ws.stream.url)
  const [quality, setQuality] = useState<StreamQuality>(ws.stream.quality)

  // Re-sync the form when the dialog targets a different workspace.
  useEffect(() => {
    setKind(ws.stream.kind)
    setUrl(ws.stream.url)
    setQuality(ws.stream.quality)
  }, [ws.id, ws.stream.kind, ws.stream.url, ws.stream.quality])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => dispatch({ type: 'panel', key: 'settingsOpen', value: false })

  const save = () => {
    const stream = { kind, url: url.trim(), quality }
    try {
      localStorage.setItem(`fenwick.stream.ws${ws.slot}`, JSON.stringify(stream))
    } catch {
      /* storage unavailable — session-only settings */
    }
    dispatch({
      type: 'ws',
      id: ws.id,
      patch: {
        stream,
        streamState: stream.url ? 'connecting' : 'waiting',
        status: stream.url ? 'connecting' : ws.status,
        inputAvailable: true,
      },
    })
    toast('info', 'Stream settings saved. Reconnecting the media surface…')
    close()
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Session settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <Settings2 size={18} color="var(--accent)" />
          Session settings — {ws.name}
        </div>

        <div className="field">
          <label htmlFor="stream-kind">Stream protocol</label>
          <select
            id="stream-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as StreamKind)}
          >
            <option value="mjpeg">MJPEG stream (HTTP)</option>
            <option value="webrtc">WebRTC</option>
            <option value="websocket">WebSocket frames</option>
            <option value="custom">Local capture URL</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="stream-url">Capture service URL</label>
          <input
            id="stream-url"
            type="text"
            placeholder="http://127.0.0.1:9400/stream/ws-1.mjpeg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
          />
          <span className="field-hint">
            Point Fenwick at the capture service streaming the real Fusion 360 window on
            this workstation. Leave empty to idle without a stream.
          </span>
        </div>

        <div className="field">
          <label htmlFor="stream-quality">Default quality</label>
          <select
            id="stream-quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as StreamQuality)}
          >
            <option value="auto">Auto</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="field">
          <label>Control channel</label>
          <input type="text" value={`/api/input/${ws.id}`} readOnly aria-readonly />
          <span className="field-hint">
            Pointer and keyboard events are forwarded here while the stream is live.
          </span>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={save}>
            Save & reconnect
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Maximize2,
  Minimize2,
  MonitorUp,
  Play,
  RotateCw,
  Scan,
  Users,
  VideoOff,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../state/store'
import type { StreamQuality } from '../types'
import { StreamSurface } from './StreamSurface'
import { ViewpointMenu } from './ViewpointMenu'

const RETRY_DELAY_MS = 12000

export function FusionViewport() {
  const { state, dispatch, active: ws, toast } = useApp()
  const [pointerOver, setPointerOver] = useState(false)
  const [reconnectNonce, setReconnectNonce] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const retryTimerRef = useRef<number | null>(null)

  const live = ws.streamState === 'live'
  const inputOk =
    state.backend === 'online' && live && ws.inputAvailable

  // Auto-retry failed streams on a gentle cadence.
  useEffect(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (ws.streamState === 'unavailable' && ws.stream.url) {
      retryTimerRef.current = window.setTimeout(() => {
        dispatch({
          type: 'ws',
          id: ws.id,
          patch: { streamState: 'reconnecting', status: 'reconnecting' },
        })
        setReconnectNonce((n) => n + 1)
      }, RETRY_DELAY_MS)
    }
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    }
  }, [ws.streamState, ws.stream.url, ws.id, dispatch])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const reconnect = () => {
    if (!ws.stream.url) return
    dispatch({
      type: 'ws',
      id: ws.id,
      patch: {
        streamState: 'reconnecting',
        status: 'reconnecting',
        inputAvailable: true,
      },
    })
    setReconnectNonce((n) => n + 1)
  }

  const toggleFullscreen = () => {
    const el = document.getElementById('fusion-viewport')
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => {})
  }

  const startSession = () => {
    api
      .startSession(ws.slot)
      .then(() => {
        toast('info', 'Fusion session requested — waiting for the stream to come up.')
        reconnect()
      })
      .catch(() => {
        toast('error', 'Cannot start a Fusion session — the local agent service is offline.')
      })
  }

  const overlayChip = live ? (
    <span className="chip" style={{ color: 'var(--cyan)' }}>
      <span className="dot cyan" />
      LIVE · FUSION 360
    </span>
  ) : (
    <span className="chip">
      <span
        className={`dot ${
          ws.streamState === 'connecting' || ws.streamState === 'reconnecting'
            ? 'amber'
            : 'red'
        }`}
      />
      {ws.streamState === 'connecting' && 'CONNECTING · FUSION 360'}
      {ws.streamState === 'reconnecting' && 'RECONNECTING · FUSION 360'}
      {ws.streamState === 'waiting' && 'WAITING · FUSION 360'}
      {(ws.streamState === 'unavailable' || ws.streamState === 'offline') &&
        'OFFLINE · FUSION 360'}
    </span>
  )

  return (
    <section className="viewport-frame" id="fusion-viewport" aria-label="Fusion 360 viewport">
      <StreamSurface
        workspace={ws}
        reconnectNonce={reconnectNonce}
        onPointerActivity={setPointerOver}
      />

      {/* Top overlay */}
      <div className="stream-overlay-top">
        {overlayChip}
        <div className="overlay-right">
          {(pointerOver || !inputOk) && (
            <span
              className={`chip input-chip ${inputOk ? 'active-input' : 'unavailable'}`}
            >
              <span className={`dot ${inputOk ? 'cyan' : 'amber'}`} />
              {inputOk ? 'Fusion input active' : 'Fusion input unavailable'}
            </span>
          )}
          <span className="chip">
            <Users size={13} />
            {ws.viewers} viewer{ws.viewers === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Honest offline / waiting states — no fake geometry */}
      {!live && (
        <div className="stream-placeholder">
          {ws.streamState === 'waiting' && !ws.stream.url ? (
            <>
              <div className="ph-icon">
                <MonitorUp size={26} />
              </div>
              <h2>Waiting for a Fusion session</h2>
              <p>
                Start a Fusion 360 session on this workstation and Fenwick will attach to
                its live window stream.
              </p>
              <button type="button" className="btn primary" onClick={startSession}>
                <Play size={14} />
                Start Fusion session
              </button>
            </>
          ) : ws.streamState === 'connecting' || ws.streamState === 'reconnecting' ? (
            <>
              <div className="ph-icon">
                <Loader2 size={26} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <h2>
                {ws.streamState === 'connecting'
                  ? 'Connecting to the local workstation'
                  : 'Reconnecting to the local workstation'}
              </h2>
              <p>Attaching to the Fusion 360 capture service…</p>
            </>
          ) : (
            <>
              <div className="ph-icon">
                <VideoOff size={26} />
              </div>
              <h2>
                {ws.streamState === 'offline'
                  ? 'Fusion 360 is offline'
                  : 'Stream unavailable'}
              </h2>
              <p>
                No frames are arriving from the capture service. Check that Fusion 360 and
                the Fenwick agent are running on this workstation.
              </p>
              <button type="button" className="btn" onClick={reconnect}>
                <RotateCw size={14} />
                Reconnect
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom control bar */}
      <div className="stream-controls" role="toolbar" aria-label="Stream controls">
        <button
          type="button"
          className="icon-btn"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          type="button"
          className={`icon-btn${ws.fitMode === 'cover' ? ' active' : ''}`}
          aria-label="Fit view"
          title={ws.fitMode === 'contain' ? 'Fit view: contain' : 'Fit view: fill'}
          onClick={() =>
            dispatch({
              type: 'ws',
              id: ws.id,
              patch: { fitMode: ws.fitMode === 'contain' ? 'cover' : 'contain' },
            })
          }
        >
          <Scan size={16} />
        </button>
        <ViewpointMenu workspace={ws} direction="up" compact />
        <div className="sep" />
        <select
          className="quality-select"
          aria-label="Stream quality"
          value={ws.stream.quality}
          onChange={(e) =>
            dispatch({
              type: 'ws',
              id: ws.id,
              patch: { stream: { ...ws.stream, quality: e.target.value as StreamQuality } },
            })
          }
        >
          <option value="auto">Auto quality</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="sep" />
        <span className="chip" style={{ border: 'none', background: 'transparent' }}>
          <Users size={13} />
          {ws.viewers}
        </span>
        <div className="sep" />
        <button
          type="button"
          className="icon-btn"
          aria-label="Reconnect stream"
          title="Reconnect"
          onClick={reconnect}
          disabled={!ws.stream.url}
        >
          <RotateCw size={16} />
        </button>
      </div>
    </section>
  )
}

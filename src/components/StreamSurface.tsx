import { useCallback, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { connectStream } from '../api/streamAdapter'
import { statusForStream, useApp } from '../state/store'
import type { InputEvent, WorkspaceState } from '../types'

interface Props {
  workspace: WorkspaceState
  /** Increment to force a reconnect attempt. */
  reconnectNonce: number
  onPointerActivity: (over: boolean) => void
}

const POINTER_THROTTLE_MS = 50

/**
 * The real media surface for the Fusion stream. Renders whichever element the
 * active stream protocol needs (img / video / canvas) and forwards pointer,
 * wheel, and keyboard events to the local input service. Never draws fake
 * geometry — when no frames arrive, the viewport overlay says so.
 */
export function StreamSurface({ workspace: ws, reconnectNonce, onPointerActivity }: Props) {
  const { state, dispatch } = useApp()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastMoveRef = useRef(0)
  const inputFailuresRef = useRef(0)

  const inputOk =
    state.backend === 'online' && ws.streamState === 'live' && ws.inputAvailable

  // --- Stream lifecycle -----------------------------------------------------
  useEffect(() => {
    const handle = connectStream(
      ws.stream,
      {
        img: imgRef.current,
        video: videoRef.current,
        canvas: canvasRef.current,
      },
      (s) => {
        dispatch({
          type: 'ws',
          id: ws.id,
          patch: {
            streamState: s,
            status: statusForStream(s, Boolean(ws.stream.url)),
            // A fresh live stream resets the input channel assumption.
            ...(s === 'live' ? { inputAvailable: true } : {}),
          },
        })
        if (s === 'live') inputFailuresRef.current = 0
      },
    )
    return () => handle.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.stream.kind, ws.stream.url, ws.stream.quality, reconnectNonce])

  // --- Input forwarding -------------------------------------------------------
  const sendInput = useCallback(
    (evt: InputEvent) => {
      if (!inputOk) return
      api.sendInput(ws.id, evt).catch(() => {
        inputFailuresRef.current += 1
        if (inputFailuresRef.current >= 2) {
          dispatch({ type: 'ws', id: ws.id, patch: { inputAvailable: false } })
        }
      })
    },
    [inputOk, ws.id, dispatch],
  )

  const coords = (e: React.PointerEvent | React.MouseEvent | WheelEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    }
  }

  const modifiers = (e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }) => {
    const mods: string[] = []
    if (e.shiftKey) mods.push('shift')
    if (e.ctrlKey) mods.push('ctrl')
    if (e.altKey) mods.push('alt')
    if (e.metaKey) mods.push('meta')
    return mods
  }

  // Wheel must be non-passive so orbit zoom doesn't scroll the page.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!inputOk) return
      const { x, y } = coords(e)
      sendInput({ type: 'wheel', x, y, deltaY: e.deltaY, modifiers: modifiers(e) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputOk, sendInput])

  return (
    <div
      ref={surfaceRef}
      id="fusion-stream-surface"
      className="stream-surface"
      tabIndex={0}
      role="application"
      aria-label={`Fusion 360 stream for ${ws.name}`}
      onPointerEnter={() => onPointerActivity(true)}
      onPointerLeave={() => onPointerActivity(false)}
      onPointerMove={(e) => {
        const now = performance.now()
        if (now - lastMoveRef.current < POINTER_THROTTLE_MS) return
        lastMoveRef.current = now
        const { x, y } = coords(e)
        sendInput({ type: 'pointermove', x, y, modifiers: modifiers(e) })
      }}
      onPointerDown={(e) => {
        surfaceRef.current?.focus()
        surfaceRef.current?.setPointerCapture(e.pointerId)
        const { x, y } = coords(e)
        sendInput({
          type: 'pointerdown',
          x,
          y,
          button: e.button,
          modifiers: modifiers(e),
        })
      }}
      onPointerUp={(e) => {
        if (surfaceRef.current?.hasPointerCapture(e.pointerId)) {
          surfaceRef.current.releasePointerCapture(e.pointerId)
        }
        const { x, y } = coords(e)
        sendInput({ type: 'pointerup', x, y, button: e.button, modifiers: modifiers(e) })
      }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (!inputOk) return
        e.preventDefault()
        sendInput({ type: 'keydown', key: e.key, modifiers: modifiers(e) })
      }}
      onKeyUp={(e) => {
        if (!inputOk) return
        sendInput({ type: 'keyup', key: e.key, modifiers: modifiers(e) })
      }}
    >
      {(ws.stream.kind === 'mjpeg' || ws.stream.kind === 'custom') && (
        <img
          ref={imgRef}
          className={`stream-media${ws.fitMode === 'cover' ? ' cover' : ''}`}
          alt=""
          draggable={false}
          style={{ display: ws.streamState === 'live' ? 'block' : 'none' }}
        />
      )}
      {ws.stream.kind === 'webrtc' && (
        <video
          ref={videoRef}
          className={`stream-media${ws.fitMode === 'cover' ? ' cover' : ''}`}
          muted
          playsInline
          style={{ display: ws.streamState === 'live' ? 'block' : 'none' }}
        />
      )}
      {ws.stream.kind === 'websocket' && (
        <canvas
          ref={canvasRef}
          className={`stream-media${ws.fitMode === 'cover' ? ' cover' : ''}`}
          style={{ display: ws.streamState === 'live' ? 'block' : 'none' }}
        />
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import './VoiceDictation.css'

/**
 * Voice -> prescription dictation, entirely in the browser.
 *
 * Uses the Web Speech API (SpeechRecognition) — no server, no API key, no cost.
 * Chrome and Edge only, and the page must be served over HTTPS or localhost.
 *
 * Controlled: the words land in the target field as they are spoken.
 *
 *   <VoiceDictation value={form.notes} onChange={(text) => updateField('notes', text)} />
 */

const FATAL_ERRORS = {
  'not-allowed': 'Microphone access was blocked. Allow it in the browser address bar and try again.',
  'service-not-allowed': 'Speech recognition was blocked by the browser.',
  'audio-capture': 'No microphone was found on this device.',
  network: 'Speech recognition needs an internet connection.',
}

function getSpeechRecognition() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function formatDuration(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  return `${mins}:${secs}`
}

// Dictated text is appended below whatever was already in the field.
function compose(base, spoken) {
  const text = spoken.trim()
  if (!text) return base
  return base ? `${base}\n${text}` : text
}

function VoiceDictation({
  title = 'Voice — Prescription',
  hint = 'Tap the mic and dictate — the words appear in Notes as you speak.',
  value = '',
  onChange,
  disabled = false,
  lang = 'en-IN',
  maxSeconds = 120,
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const keepGoingRef = useRef(false)
  const timerRef = useRef(null)
  // Recognition events can arrive after unmount; they must not write anything.
  const mountedRef = useRef(true)
  // Field contents when recording started; dictation is appended to this.
  const baseRef = useRef('')
  // Latest value, so handlers bound once still write against fresh text.
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  valueRef.current = value
  onChangeRef.current = onChange

  const supported = Boolean(getSpeechRecognition())

  function clearTimer() {
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  function publish(spoken) {
    if (!mountedRef.current) return
    onChangeRef.current?.(compose(baseRef.current, spoken))
  }

  // Chrome pauses recognition on silence; restart until the doctor taps stop.
  function handleEnd() {
    if (keepGoingRef.current) {
      try {
        recognitionRef.current?.start()
        return
      } catch {
        // already restarting — fall through and settle
      }
    }

    clearTimer()
    recognitionRef.current = null
    // Drop any half-recognised tail; keep only what was finalised.
    publish(finalTextRef.current)
    setInterim('')
    setIsRecording(false)
  }

  function handleResult(event) {
    let pending = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      if (result.isFinal) {
        finalTextRef.current += `${result[0].transcript.trim()} `
      } else {
        pending += result[0].transcript
      }
    }
    setInterim(pending)
    publish(`${finalTextRef.current}${pending}`)
  }

  function handleError(event) {
    if (event.error === 'no-speech' || event.error === 'aborted') return
    const message = FATAL_ERRORS[event.error]
    if (!message) return
    keepGoingRef.current = false
    setError(message)
  }

  function startRecording() {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return

    setError(null)
    setInterim('')
    setSeconds(0)
    finalTextRef.current = ''
    baseRef.current = valueRef.current

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = handleResult
    recognition.onerror = handleError
    recognition.onend = handleEnd

    try {
      recognition.start()
    } catch {
      setError('Recording could not be started. Try again.')
      return
    }

    recognitionRef.current = recognition
    keepGoingRef.current = true
    setIsRecording(true)

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1
        if (next >= maxSeconds) stopRecording()
        return next
      })
    }, 1000)
  }

  function stopRecording() {
    keepGoingRef.current = false
    clearTimer()
    recognitionRef.current?.stop()
  }

  // Undo this dictation: put the field back to what it held before the mic.
  function cancelRecording() {
    keepGoingRef.current = false
    finalTextRef.current = ''
    clearTimer()
    recognitionRef.current?.abort()
    onChangeRef.current?.(baseRef.current)
    setInterim('')
    setSeconds(0)
    setIsRecording(false)
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      keepGoingRef.current = false
      clearInterval(timerRef.current)
      recognitionRef.current?.abort()
    }
  }, [])

  return (
    <section className={`voice-card${isRecording ? ' is-recording' : ''}`}>
      <div className="voice-card-main">
        <button
          type="button"
          className="voice-mic"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || !supported}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <span className="voice-stop-icon" /> : '🎙'}
        </button>

        <div className="voice-copy">
          <h4>{title}</h4>
          <p>
            {!supported
              ? 'Voice dictation needs Chrome or Edge, on an HTTPS or localhost address.'
              : isRecording
                ? `Listening… ${formatDuration(seconds)} — writing into Notes below.`
                : hint}
          </p>
        </div>

        {isRecording && (
          <button type="button" className="voice-link" onClick={cancelRecording}>
            Cancel
          </button>
        )}
      </div>

      {error && <p className="voice-error">{error}</p>}

      {isRecording && (
        <p className="voice-live" aria-live="polite">
          {interim ? <span className="voice-interim">{interim}</span> : (
            <span className="voice-waiting">Start speaking…</span>
          )}
        </p>
      )}
    </section>
  )
}

export default VoiceDictation

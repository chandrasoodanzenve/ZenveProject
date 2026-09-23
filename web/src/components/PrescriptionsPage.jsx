import { useEffect, useRef, useState } from 'react'
import VoiceDictation from './VoiceDictation'
import PrescriptionPreview from './PrescriptionPreview'
import { createPrescription, updatePrescription } from '../api'
import './PrescriptionsPage.css'

const AUTOSAVE_DELAY_MS = 1500

function emptyForm() {
  return {
    patientId: '',
    weight: '',
    date: new Date().toISOString().slice(0, 10),
    complaint: '',
    diagnosis: '',
    notes: '',
  }
}

function toPayload(form, status) {
  return {
    patientId: Number(form.patientId),
    weight: form.weight === '' ? null : Number(form.weight),
    date: form.date || null,
    complaint: form.complaint.trim(),
    diagnosis: form.diagnosis.trim(),
    notes: form.notes.trim(),
    status,
  }
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Picking a patient is not yet a prescription — don't write a row until
// something has actually been dictated or typed.
function hasContent(form) {
  return Boolean(form.notes.trim() || form.complaint.trim() || form.diagnosis.trim())
}

function PrescriptionsPage({ patients, doctor, signatureUrl }) {
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)
  // Bumped on reset so the dictation card remounts: the mic stops and forgets
  // the previous prescription's text instead of writing it back into Notes.
  const [dictationKey, setDictationKey] = useState(0)

  // Refs, not state: writing these must never retrigger the auto-save effect.
  const formRef = useRef(form)
  const prescriptionIdRef = useRef(null)
  const savedSnapshotRef = useRef(null)
  // Every write goes through this chain, so requests can never overlap or reorder.
  const queueRef = useRef(Promise.resolve())

  formRef.current = form

  function updateField(field, value) {
    setSavedMessage(null)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function writeNow(status) {
    const current = formRef.current
    if (!current.patientId) return null
    // Auto-save never creates an empty row; an explicit Save still may.
    if (status === 'DRAFT' && !prescriptionIdRef.current && !hasContent(current)) return null

    const payload = toPayload(current, status)
    const snapshot = JSON.stringify(payload)

    // Nothing changed since the last write — skip the round trip.
    if (status === 'DRAFT' && snapshot === savedSnapshotRef.current) return null

    setIsSaving(true)
    setError(null)
    try {
      const saved = prescriptionIdRef.current
        ? await updatePrescription(prescriptionIdRef.current, payload)
        : await createPrescription(payload)

      prescriptionIdRef.current = saved.id
      savedSnapshotRef.current = JSON.stringify(toPayload(current, 'DRAFT'))
      setLastSavedAt(new Date())
      return saved
    } catch (err) {
      setError(err.message || 'Changes could not be saved. Your text is still on screen.')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  // Serialize writes: a Save always runs after any auto-save already in flight.
  function enqueue(status) {
    const result = queueRef.current.then(() => writeNow(status))
    queueRef.current = result.catch(() => {})
    return result
  }

  const snapshot = form.patientId ? JSON.stringify(toPayload(form, 'DRAFT')) : null
  const isDirty = Boolean(snapshot) && snapshot !== savedSnapshotRef.current

  // Auto-save: debounced, and only when something actually changed.
  useEffect(() => {
    if (!snapshot || snapshot === savedSnapshotRef.current) return undefined
    const timeout = setTimeout(() => enqueue('DRAFT'), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot])

  // Unsaved text on screen — warn before the tab closes.
  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function startNewPrescription() {
    prescriptionIdRef.current = null
    savedSnapshotRef.current = null
    setForm(emptyForm())
    setLastSavedAt(null)
    setError(null)
    setDictationKey((key) => key + 1)
  }

  function handleClear() {
    startNewPrescription()
    setSavedMessage(null)
  }

  async function handleSave() {
    setSavedMessage(null)

    if (!form.patientId) {
      setError('Select a patient before saving.')
      return
    }

    const saved = await enqueue('SAVED')
    if (!saved) return

    setSavedMessage(`Prescription saved for ${saved.petName}.`)
    startNewPrescription()
  }

  const selectedPatient = patients.find((patient) => String(patient.id) === String(form.patientId))

  function statusLabel() {
    if (isSaving) return 'Saving…'
    if (!form.patientId) return 'Select a patient to start auto-saving'
    if (!prescriptionIdRef.current && !hasContent(form)) return 'Dictate or type to start auto-saving'
    if (isDirty) return 'Unsaved changes…'
    if (lastSavedAt) return `Draft auto-saved at ${formatTime(lastSavedAt)}`
    return 'Auto-save is on'
  }

  return (
    <div className="prescriptions-page">
      <header className="prescriptions-header">
        <div>
          <h2>Digital prescription</h2>
          <p>Dictate the prescription — it is transcribed into the notes below.</p>
        </div>
        <button type="button" className="btn-link" onClick={handleClear} disabled={isSaving}>
          Clear form
        </button>
      </header>

      <div className="prescriptions-layout">
        <div className="prescription-card">
          <div className="prescription-row">
            <label>
              Patient
              <select
                value={form.patientId}
                onChange={(event) => updateField('patientId', event.target.value)}
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.petName}
                    {patient.ownerName ? ` — ${patient.ownerName}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Weight (kg)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.weight}
                onChange={(event) => updateField('weight', event.target.value)}
              />
            </label>

            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
              />
            </label>
          </div>

          <VoiceDictation
            key={dictationKey}
            value={form.notes}
            onChange={(text) => updateField('notes', text)}
          />

          <label>
            Presenting complaint
            <input
              type="text"
              value={form.complaint}
              onChange={(event) => updateField('complaint', event.target.value)}
            />
          </label>

          <label>
            Diagnosis
            <input
              type="text"
              value={form.diagnosis}
              onChange={(event) => updateField('diagnosis', event.target.value)}
            />
          </label>

          <label>
            Notes
            <textarea
              rows={8}
              placeholder="Dictate with the mic above, or type here."
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </label>

          {error && <p className="prescription-error">{error}</p>}
          {savedMessage && <p className="prescription-saved">{savedMessage}</p>}
        </div>

        <PrescriptionPreview
          form={form}
          patient={selectedPatient}
          doctor={doctor}
          signatureUrl={signatureUrl}
        />
      </div>

      <div className="prescription-savebar">
        <span className={`prescription-status${isDirty ? ' is-dirty' : ''}`}>{statusLabel()}</span>
        <button
          type="button"
          className="btn-primary btn-save"
          onClick={handleSave}
          disabled={isSaving || !form.patientId}
        >
          {isSaving ? 'Saving…' : 'Save prescription'}
        </button>
      </div>
    </div>
  )
}

export default PrescriptionsPage

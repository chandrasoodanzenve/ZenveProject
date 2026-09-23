import './PrescriptionPreview.css'

function formatDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-')
  return `${day}-${month}-${year}`
}

function Field({ label, value, block = false }) {
  return (
    <div className={`rx-field${block ? ' rx-field-block' : ''}`}>
      <span className="rx-label">{label}</span>
      <span className={`rx-value${value ? '' : ' is-empty'}`}>{value || '—'}</span>
    </div>
  )
}

function PrescriptionPreview({ form, patient, doctor, signatureUrl }) {
  const clinicName = doctor?.hospitalName || 'Zenve Veterinary Clinic'
  const credentials =
    [doctor?.qualification, doctor?.specialization].filter(Boolean).join(' · ') ||
    'Veterinary Doctor — General & Emergency Care'

  return (
    <aside className="rx-preview" aria-label="Prescription preview">
      <header className="rx-head">
        <div className="rx-brand">
          <span className="rx-logo" aria-hidden="true">🐾</span>
          <div>
            <h3>{clinicName}</h3>
            <p>{credentials}</p>
          </div>
        </div>
        <div className="rx-head-meta">
          <span className="rx-badge">Prescription</span>
          <span className="rx-head-date">{formatDate(form.date) || '—'}</span>
        </div>
      </header>

      <div className="rx-body">
        <div className="rx-row rx-row-4">
          <Field label="Patient" value={patient?.petName} />
          <Field label="Owner" value={patient?.ownerName} />
          <Field label="Weight" value={form.weight ? `${form.weight} kg` : null} />
          <Field label="Date" value={formatDate(form.date)} />
        </div>

        <div className="rx-row rx-row-2">
          <Field label="Complaint" value={form.complaint} />
          <Field label="Diagnosis" value={form.diagnosis} />
        </div>

        <Field label="Notes" value={form.notes} block />
      </div>

      <div className="rx-sign">
        <div className="rx-sign-mark">
          {signatureUrl ? (
            <img src={signatureUrl} alt={`${doctor?.name || 'Doctor'} signature`} />
          ) : (
            <span className="rx-sign-missing">
              Upload a signature in My profile to sign prescriptions
            </span>
          )}
        </div>
        <div className="rx-sign-name">
          <strong>{doctor?.name || '—'}</strong>
          {doctor?.mobile && <span>{doctor.mobile}</span>}
        </div>
      </div>

      <p className="rx-footer">This is a computer-generated prescription.</p>
    </aside>
  )
}

export default PrescriptionPreview

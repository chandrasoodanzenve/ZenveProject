import { useState } from 'react'
import './DoctorProfilePage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function toForm(profile) {
  return {
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    mobile: profile?.mobile ?? '',
    specialization: profile?.specialization ?? '',
    qualification: profile?.qualification ?? '',
    experienceYears: profile?.experienceYears ?? '',
    hospitalName: profile?.hospitalName ?? '',
    address: profile?.address ?? '',
    consultationFee: profile?.consultationFee ?? '',
    availability: profile?.availability ?? '',
  }
}

function validate(form) {
  const errors = {}

  if (!form.name.trim()) errors.name = 'Doctor name is required.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.'

  const mobile = form.mobile.replace(/[^0-9]/g, '')
  if (form.mobile.trim() && (mobile.length < 10 || mobile.length > 15)) {
    errors.mobile = 'Enter a 10 to 15 digit mobile number.'
  }

  if (form.experienceYears !== '') {
    const years = Number(form.experienceYears)
    if (!Number.isFinite(years) || years < 0 || years > 70) {
      errors.experienceYears = 'Enter experience between 0 and 70 years.'
    }
  }

  if (form.consultationFee !== '') {
    const fee = Number(form.consultationFee)
    if (!Number.isFinite(fee) || fee < 0) errors.consultationFee = 'Enter a valid fee.'
  }

  return errors
}

/** Mirrors the server-side check so a bad file never leaves the browser. */
function validateImage(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Unsupported file type. Upload a PNG, JPG or JPEG image.'
  }
  if (file.size > MAX_IMAGE_BYTES) return 'That file is too large. Upload an image under 2 MB.'
  return null
}

function formatFee(value) {
  if (value === null || value === undefined || value === '') return null
  return `₹ ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function ReadOnlyField({ label, value, wide = false }) {
  return (
    <div className={`profile-view-field${wide ? ' wide' : ''}`}>
      <span className="profile-view-label">{label}</span>
      <span className={`profile-view-value${value ? '' : ' is-empty'}`}>
        {value || 'Not added yet'}
      </span>
    </div>
  )
}

function DoctorProfilePage({
  profile,
  photoUrl,
  signatureUrl,
  loading,
  error,
  onSave,
  onUploadPhoto,
  onUploadSignature,
  onToggleVideoConsultation,
  onRegenerateVideoRoom,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(() => toForm(profile))
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const [uploadError, setUploadError] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [togglingVideo, setTogglingVideo] = useState(false)
  const [roomBusy, setRoomBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
  }

  function startEditing() {
    setForm(toForm(profile))
    setFieldErrors({})
    setFormError(null)
    setNotice(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setFieldErrors({})
    setFormError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const errors = validate(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.replace(/[^0-9]/g, ''),
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),
      experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
      hospitalName: form.hospitalName.trim(),
      address: form.address.trim(),
      consultationFee: form.consultationFee === '' ? null : Number(form.consultationFee),
      availability: form.availability.trim(),
      videoConsultationEnabled: profile.videoConsultationEnabled,
    }

    setIsSaving(true)
    try {
      await onSave(payload)
      setIsEditing(false)
      setNotice('Profile saved.')
    } catch (err) {
      setFormError(err.message || 'Could not save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleImageChange(event, kind) {
    const input = event.target
    const file = input.files?.[0]
    input.value = '' // let the same file be picked again after a failure
    if (!file) return

    setUploadError(null)
    setNotice(null)

    const validationError = validateImage(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploading(kind)
    try {
      if (kind === 'signature') {
        await onUploadSignature(file)
        setNotice('Signature uploaded.')
      } else {
        await onUploadPhoto(file)
        setNotice('Profile photo updated.')
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  async function handleVideoToggle(event) {
    const enabled = event.target.checked
    setUploadError(null)
    setFormError(null)
    setNotice(null)
    setTogglingVideo(true)
    try {
      await onToggleVideoConsultation(enabled)
      setNotice(
        enabled
          ? 'Video consultation is ON. You can now accept video appointments.'
          : 'Video consultation is OFF. Video appointments are unavailable for you.',
      )
    } catch (err) {
      setFormError(err.message || 'Could not update video consultation. Please try again.')
    } finally {
      setTogglingVideo(false)
    }
  }

  if (loading && !profile) {
    return (
      <div className="profile-page">
        <p className="profile-empty">Loading your profile…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="form-error">{error || 'Your profile could not be loaded.'}</div>
      </div>
    )
  }

  async function handleCopyRoomLink() {
    try {
      await navigator.clipboard.writeText(profile.videoRoomUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setUploadError('Could not copy the link. Select and copy it manually.')
    }
  }

  async function handleNewRoom() {
    if (!window.confirm('Generate a new room link? The current link will stop working.')) return
    setRoomBusy(true)
    setNotice(null)
    try {
      await onRegenerateVideoRoom()
      setNotice('New room link generated. Share the new link with patients.')
    } catch (err) {
      setFormError(err.message || 'Could not generate a new room. Please try again.')
    } finally {
      setRoomBusy(false)
    }
  }

  const initials = (profile.name || profile.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <h2>My profile</h2>
          <p>Details here appear on your prescriptions and booking pages.</p>
        </div>
        {!isEditing && (
          <button type="button" className="btn-primary" onClick={startEditing}>
            Edit profile
          </button>
        )}
      </header>

      {error && <div className="form-error">{error}</div>}
      {notice && (
        <div className="form-notice" role="status">
          {notice}
        </div>
      )}

      <section className="profile-identity">
        <div className="profile-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt={`${profile.name} profile photo`} />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>
        <div className="profile-identity-body">
          <h3>{profile.name}</h3>
          <p>
            {[profile.specialization, profile.qualification].filter(Boolean).join(' · ') ||
              'Add your specialization and qualification'}
          </p>
          <label className="profile-upload-link">
            {uploading === 'photo' ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={(e) => handleImageChange(e, 'photo')}
              disabled={uploading !== null}
            />
          </label>
        </div>
        <span className={`profile-video-badge${profile.videoConsultationEnabled ? ' is-on' : ''}`}>
          Video consultation {profile.videoConsultationEnabled ? 'ON' : 'OFF'}
        </span>
      </section>

      {uploadError && <div className="form-error">{uploadError}</div>}

      {isEditing ? (
        <form className="profile-card profile-form" onSubmit={handleSubmit} noValidate>
          <h3>Profile details</h3>
          {formError && (
            <div className="form-error" role="alert">
              {formError}
            </div>
          )}

          <div className="profile-grid">
            <label>
              Doctor name
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              <span className="field-hint">This is also your login email.</span>
            </label>

            <label>
              Mobile number
              <input
                type="tel"
                placeholder="9876543210"
                value={form.mobile}
                onChange={(e) => updateField('mobile', e.target.value)}
                aria-invalid={Boolean(fieldErrors.mobile)}
              />
              {fieldErrors.mobile && <span className="field-error">{fieldErrors.mobile}</span>}
              <span className="field-hint">You can log in with this number.</span>
            </label>

            <label>
              Specialization
              <input
                type="text"
                placeholder="e.g. Small Animal Surgery"
                value={form.specialization}
                onChange={(e) => updateField('specialization', e.target.value)}
              />
            </label>

            <label>
              Qualification
              <input
                type="text"
                placeholder="e.g. BVSc &amp; AH, MVSc"
                value={form.qualification}
                onChange={(e) => updateField('qualification', e.target.value)}
              />
            </label>

            <label>
              Experience (years)
              <input
                type="number"
                min="0"
                max="70"
                placeholder="e.g. 8"
                value={form.experienceYears}
                onChange={(e) => updateField('experienceYears', e.target.value)}
                aria-invalid={Boolean(fieldErrors.experienceYears)}
              />
              {fieldErrors.experienceYears && (
                <span className="field-error">{fieldErrors.experienceYears}</span>
              )}
            </label>

            <label>
              Hospital / clinic name
              <input
                type="text"
                placeholder="e.g. Zenve Veterinary Clinic"
                value={form.hospitalName}
                onChange={(e) => updateField('hospitalName', e.target.value)}
              />
            </label>

            <label>
              Consultation fee
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500"
                value={form.consultationFee}
                onChange={(e) => updateField('consultationFee', e.target.value)}
                aria-invalid={Boolean(fieldErrors.consultationFee)}
              />
              {fieldErrors.consultationFee && (
                <span className="field-error">{fieldErrors.consultationFee}</span>
              )}
            </label>

            <label className="profile-field-wide">
              Address
              <textarea
                rows="2"
                placeholder="Street, area, city, PIN"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </label>

            <label className="profile-field-wide">
              Availability / working hours
              <textarea
                rows="2"
                placeholder="e.g. Mon-Sat 10:00 AM - 1:00 PM, 5:00 PM - 8:00 PM"
                value={form.availability}
                onChange={(e) => updateField('availability', e.target.value)}
              />
            </label>
          </div>

          <div className="profile-actions">
            <button type="button" className="btn-secondary" onClick={cancelEditing}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <section className="profile-card">
          <h3>Profile details</h3>
          <div className="profile-view-grid">
            <ReadOnlyField label="Doctor name" value={profile.name} />
            <ReadOnlyField label="Email" value={profile.email} />
            <ReadOnlyField label="Mobile number" value={profile.mobile} />
            <ReadOnlyField label="Specialization" value={profile.specialization} />
            <ReadOnlyField label="Qualification" value={profile.qualification} />
            <ReadOnlyField
              label="Experience"
              value={
                profile.experienceYears === null || profile.experienceYears === undefined
                  ? null
                  : `${profile.experienceYears} year${profile.experienceYears === 1 ? '' : 's'}`
              }
            />
            <ReadOnlyField label="Hospital / clinic" value={profile.hospitalName} />
            <ReadOnlyField label="Consultation fee" value={formatFee(profile.consultationFee)} />
            <ReadOnlyField label="Address" value={profile.address} wide />
            <ReadOnlyField label="Availability / working hours" value={profile.availability} wide />
          </div>
        </section>
      )}

      <section className="profile-card">
        <h3>Digital signature</h3>
        <p className="profile-card-note">
          Used wherever your signature is required, including prescriptions. PNG, JPG or JPEG up to
          2 MB.
        </p>

        <div className="signature-row">
          <div className={`signature-preview${signatureUrl ? '' : ' is-empty'}`}>
            {signatureUrl ? (
              <img src={signatureUrl} alt={`${profile.name} digital signature`} />
            ) : (
              <span>No signature uploaded</span>
            )}
          </div>
          <div className="signature-actions">
            <label className="btn-secondary signature-upload">
              {uploading === 'signature'
                ? 'Uploading…'
                : profile.hasSignature
                  ? 'Replace signature'
                  : 'Upload signature'}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={(e) => handleImageChange(e, 'signature')}
                disabled={uploading !== null}
              />
            </label>
            {profile.hasSignature && (
              <span className="signature-status">
                Saved — this signature is applied to new prescriptions.
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="profile-card">
        <h3>Video consultation</h3>
        <div className="video-row">
          <p className="profile-card-note">
            {profile.videoConsultationEnabled
              ? 'You can accept video consultation appointments.'
              : 'Video consultation is not available for you. Patients can only book in-clinic visits.'}
          </p>
          <label className="switch">
            <input
              type="checkbox"
              checked={profile.videoConsultationEnabled}
              onChange={handleVideoToggle}
              disabled={togglingVideo}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="switch-label">
              {togglingVideo ? 'Saving…' : profile.videoConsultationEnabled ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        {profile.videoConsultationEnabled && profile.videoRoomUrl && (
          <div className="video-room">
            <span className="profile-view-label">Your consultation room</span>
            <div className="video-room-link">
              <input type="text" value={profile.videoRoomUrl} readOnly aria-label="Consultation room link" />
              <button type="button" className="btn-secondary" onClick={handleCopyRoomLink}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <p className="profile-card-note">
              Send this link to the patient, then open the room to start the call. Anyone with the
              link can join, so share it per appointment.
            </p>
            <div className="video-room-actions">
              <a
                className="btn-primary"
                href={profile.videoRoomUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Start consultation
              </a>
              <button
                type="button"
                className="btn-link"
                onClick={handleNewRoom}
                disabled={roomBusy}
              >
                {roomBusy ? 'Generating…' : 'Generate a new link'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default DoctorProfilePage

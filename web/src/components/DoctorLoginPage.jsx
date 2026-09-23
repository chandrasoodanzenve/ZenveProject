import { useState } from 'react'
import { login, requestPasswordReset, resetPassword } from '../api'
import './DoctorLoginPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_PATTERN = /^[0-9]{10,15}$/
const MIN_PASSWORD_LENGTH = 6

/** The field accepts either form, so validate whichever one the doctor typed. */
function validateIdentifier(value) {
  const trimmed = value.trim()
  if (!trimmed) return 'Enter your email or mobile number.'
  if (trimmed.includes('@')) {
    return EMAIL_PATTERN.test(trimmed) ? null : 'Enter a valid email address.'
  }
  const digits = trimmed.replace(/[^0-9]/g, '')
  return MOBILE_PATTERN.test(digits) ? null : 'Enter a 10 to 15 digit mobile number.'
}

function validatePassword(value) {
  if (!value) return 'Enter your password.'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

/** Mobile numbers are stored as digits, so strip any spacing or punctuation. */
function normalizeIdentifier(value) {
  const trimmed = value.trim()
  return trimmed.includes('@') ? trimmed : trimmed.replace(/[^0-9]/g, '')
}

const COPY = {
  login: {
    heading: 'Doctor login',
    blurb: 'Sign in to reach your dashboard, patients and prescriptions.',
    submit: 'Log in',
    submitting: 'Logging in…',
  },
  forgot: {
    heading: 'Reset your password',
    blurb: 'Tell us the email or mobile number on your account.',
    submit: 'Send reset link',
    submitting: 'Sending…',
  },
  reset: {
    heading: 'Choose a new password',
    blurb: 'Pick a password you have not used on this account before.',
    submit: 'Save new password',
    submitting: 'Saving…',
  },
}

function DoctorLoginPage({ onLogin, resetToken, onResetTokenDiscarded, onPasswordReset }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const copy = COPY[mode]

  function clearFieldError(field) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev))
  }

  /**
   * Only a value that was actually typed is checked on blur. Flagging an
   * untouched empty field would insert an error line and shift the buttons
   * below it away from the pointer mid-click; "required" is caught on submit.
   */
  function validateOnBlur(field, value, validator) {
    if (!value.trim()) return
    setFieldErrors((prev) => ({ ...prev, [field]: validator(value) }))
  }

  function switchMode(next) {
    setMode(next)
    setFormError(null)
    setNotice(null)
    setFieldErrors({})
    setPassword('')
    setConfirmPassword('')
    if (next !== 'reset') onResetTokenDiscarded?.()
  }

  async function handleLogin(event) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const errors = {
      identifier: validateIdentifier(identifier),
      password: validatePassword(password),
    }
    setFieldErrors(errors)
    if (errors.identifier || errors.password) return

    setIsSubmitting(true)
    try {
      onLogin(await login(normalizeIdentifier(identifier), password))
    } catch (err) {
      setFormError(err.message || 'Unable to log in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleForgot(event) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const identifierError = validateIdentifier(identifier)
    setFieldErrors({ identifier: identifierError })
    if (identifierError) return

    setIsSubmitting(true)
    try {
      const response = await requestPasswordReset(normalizeIdentifier(identifier))
      setMode('login')
      setNotice(response.message)
    } catch (err) {
      setFormError(err.message || 'Unable to send a reset link. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleNewPassword(event) {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    const errors = { password: validatePassword(password) }
    if (!errors.password && confirmPassword !== password) {
      errors.confirmPassword = 'Both passwords must match.'
    }
    setFieldErrors(errors)
    if (errors.password || errors.confirmPassword) return

    setIsSubmitting(true)
    try {
      const response = await resetPassword(resetToken, password)
      onPasswordReset?.()
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setNotice(response.message)
    } catch (err) {
      setFormError(err.message || 'Unable to reset your password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlers = { login: handleLogin, forgot: handleForgot, reset: handleNewPassword }

  return (
    <div className="doctor-login">
      <section className="doctor-login-brand" aria-hidden="true">
        <span className="doctor-login-logo">🐾</span>
        <h1>Zenve Doctors</h1>
        <p>Veterinary Practice OS</p>
        <ul>
          <li>Patient records and visit history</li>
          <li>Voice-dictated digital prescriptions</li>
          <li>In-clinic and video consultations</li>
        </ul>
      </section>

      <section className="doctor-login-panel">
        <form className="doctor-login-card" onSubmit={handlers[mode]} noValidate>
          <header className="doctor-login-head">
            <h2>{copy.heading}</h2>
            <p>{copy.blurb}</p>
          </header>

          {formError && (
            <div className="form-error" role="alert">
              {formError}
            </div>
          )}
          {notice && (
            <div className="form-notice" role="status">
              {notice}
            </div>
          )}

          {mode !== 'reset' && (
            <label>
              Email / Mobile number
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="doctor@clinic.com or 9876543210"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  clearFieldError('identifier')
                }}
                onBlur={() => validateOnBlur('identifier', identifier, validateIdentifier)}
                aria-invalid={Boolean(fieldErrors.identifier)}
                autoFocus
              />
              {fieldErrors.identifier && (
                <span className="field-error">{fieldErrors.identifier}</span>
              )}
            </label>
          )}

          {mode !== 'forgot' && (
            <label>
              <span className="label-row">
                {mode === 'reset' ? 'New password' : 'Password'}
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                placeholder={
                  mode === 'reset'
                    ? `At least ${MIN_PASSWORD_LENGTH} characters`
                    : 'Enter your password'
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                }}
                onBlur={() => validateOnBlur('password', password, validatePassword)}
                aria-invalid={Boolean(fieldErrors.password)}
                autoFocus={mode === 'reset'}
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </label>
          )}

          {mode === 'reset' && (
            <label>
              Confirm new password
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearFieldError('confirmPassword')
                }}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
              {fieldErrors.confirmPassword && (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              )}
            </label>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? copy.submitting : copy.submit}
          </button>

          <button
            type="button"
            className="btn-link doctor-login-switch"
            onClick={() => switchMode(mode === 'login' ? 'forgot' : 'login')}
          >
            {mode === 'login' ? 'Forgot password?' : 'Back to login'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default DoctorLoginPage

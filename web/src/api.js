const BASE_URL = '/api'

let authToken = null
let onUnauthorized = null

export function setAuthToken(token) {
  authToken = token
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

function authHeaders(extra) {
  const headers = { ...extra }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  return headers
}

/** Endpoints reachable without a token: a 401 here is a rejected attempt,
 *  not an expired session, so it must surface as the server's own message. */
const PUBLIC_PATHS = ['/auth/login', '/auth/forgot-password', '/auth/reset-password']

async function send(path, options) {
  const response = await fetch(`${BASE_URL}${path}`, options)

  const isSessionFailure = response.status === 401 || response.status === 403
  if (isSessionFailure && !PUBLIC_PATHS.includes(path)) {
    onUnauthorized?.()
    throw new Error('Your session has expired. Please log in again.')
  }

  return response
}

async function failure(response) {
  const body = await response.json().catch(() => null)
  return new Error(body?.message || `Request failed: ${response.status}`)
}

async function request(path, options) {
  const response = await send(path, {
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    ...options,
  })

  if (!response.ok) throw await failure(response)

  if (response.status === 204) return null
  return response.json()
}

/** Multipart upload - the browser must set its own Content-Type with the boundary. */
async function upload(path, file) {
  const body = new FormData()
  body.append('file', file)

  const response = await send(path, { method: 'POST', headers: authHeaders(), body })
  if (!response.ok) throw await failure(response)
  return response.json()
}

/**
 * Images live behind the bearer token, so they cannot be dropped straight into
 * an `<img src>`. Fetch the bytes and hand back an object URL instead.
 * Returns null when nothing has been uploaded yet.
 */
async function requestObjectUrl(path) {
  const response = await send(path, { headers: authHeaders() })
  if (response.status === 404) return null
  if (!response.ok) throw await failure(response)
  return URL.createObjectURL(await response.blob())
}

export function login(identifier, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function requestPasswordReset(identifier) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
}

export function resetPassword(token, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function fetchDoctorProfile() {
  return request('/doctors/me')
}

export function saveDoctorProfile(payload) {
  return request('/doctors/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function setVideoConsultation(enabled) {
  return request('/doctors/me/video-consultation', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export function regenerateVideoRoom() {
  return request('/doctors/me/video-consultation/new-room', { method: 'POST' })
}

export function uploadDoctorSignature(file) {
  return upload('/doctors/me/signature', file)
}

export function uploadDoctorPhoto(file) {
  return upload('/doctors/me/photo', file)
}

export function fetchDoctorSignatureUrl() {
  return requestObjectUrl('/doctors/me/signature')
}

export function fetchDoctorPhotoUrl() {
  return requestObjectUrl('/doctors/me/photo')
}

export function fetchAppointments({ status, mode } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (mode) params.set('mode', mode)
  const query = params.toString()
  return request(`/appointments${query ? `?${query}` : ''}`)
}

export function createAppointment(payload) {
  return request('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAppointment(id, payload) {
  return request(`/appointments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function setAppointmentStatus(id, status) {
  return request(`/appointments/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export function deleteAppointment(id) {
  return request(`/appointments/${id}`, { method: 'DELETE' })
}

export function fetchOwners() {
  return request('/owners')
}

export function fetchPatients({ species, search } = {}) {
  const params = new URLSearchParams()
  if (species && species !== 'All') params.set('species', species)
  if (search) params.set('search', search)
  const query = params.toString()
  return request(`/patients${query ? `?${query}` : ''}`)
}

export function createPatient(payload) {
  return request('/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updatePatient(id, payload) {
  return request(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deletePatient(id) {
  return request(`/patients/${id}`, { method: 'DELETE' })
}

export function fetchPrescriptions(patientId) {
  const query = patientId ? `?patientId=${patientId}` : ''
  return request(`/prescriptions${query}`)
}

export function createPrescription(payload) {
  return request('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updatePrescription(id, payload) {
  return request(`/prescriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

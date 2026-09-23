import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import PatientsPage from './components/PatientsPage'
import PrescriptionsPage from './components/PrescriptionsPage'
import DoctorLoginPage from './components/DoctorLoginPage'
import DoctorDashboardPage from './components/DoctorDashboardPage'
import DoctorProfilePage from './components/DoctorProfilePage'
import {
  fetchOwners,
  fetchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  fetchAppointments,
  createAppointment,
  updateAppointment,
  setAppointmentStatus,
  deleteAppointment,
  fetchDoctorProfile,
  fetchDoctorPhotoUrl,
  fetchDoctorSignatureUrl,
  saveDoctorProfile,
  setVideoConsultation,
  regenerateVideoRoom,
  uploadDoctorPhoto,
  uploadDoctorSignature,
  setAuthToken,
  setUnauthorizedHandler,
} from './api'
import './App.css'

const AUTH_STORAGE_KEY = 'zenve.auth'
const LANDING_PAGE = 'dashboard'

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** The emailed reset link lands on `/?reset=<token>`. */
function readResetToken() {
  try {
    return new URLSearchParams(window.location.search).get('reset')
  } catch {
    return null
  }
}

function App() {
  const [auth, setAuth] = useState(loadStoredAuth)
  const [resetToken, setResetToken] = useState(readResetToken)
  const [page, setPage] = useState(LANDING_PAGE)
  const [owners, setOwners] = useState([])
  const [patients, setPatients] = useState([])
  const [species, setSpecies] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [appointments, setAppointments] = useState([])
  const [appointmentStatus, setAppointmentStatus_] = useState('SCHEDULED')
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState(null)

  const [doctor, setDoctor] = useState(null)
  const [doctorLoading, setDoctorLoading] = useState(true)
  const [doctorError, setDoctorError] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [signatureUrl, setSignatureUrl] = useState(null)

  useEffect(() => {
    setAuthToken(auth?.token ?? null)
  }, [auth])

  useEffect(() => {
    setUnauthorizedHandler(handleLogout)
  }, [])

  /** Object URLs are leaked unless the previous one is revoked on replacement. */
  function replaceObjectUrl(setter, next) {
    setter((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next
    })
  }

  function applyAuth(authData) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
    setAuthToken(authData.token)
    setAuth(authData)
  }

  function handleLogin(authData) {
    applyAuth(authData)
    setPage(LANDING_PAGE)
  }

  /** Drop the token from state and the address bar once it is spent. */
  function clearResetToken() {
    setResetToken(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  /**
   * The server refuses tokens minted before the reset, so any session open here
   * is already dead - clear it so the doctor lands on the login form and sees
   * the confirmation, rather than a dashboard that cannot load anything.
   */
  function handlePasswordReset() {
    clearResetToken()
    if (auth) handleLogout()
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuth(null)
    setDoctor(null)
    replaceObjectUrl(setPhotoUrl, null)
    replaceObjectUrl(setSignatureUrl, null)
    setPage(LANDING_PAGE)
  }

  function loadOwners() {
    fetchOwners().then(setOwners).catch(() => {})
  }

  function loadPatients() {
    setLoading(true)
    setError(null)
    fetchPatients({ species, search })
      .then(setPatients)
      .catch((err) => setError(err.message || 'Unable to load patients from the server.'))
      .finally(() => setLoading(false))
  }

  function loadAppointments() {
    setAppointmentsLoading(true)
    setAppointmentsError(null)
    fetchAppointments({ status: appointmentStatus })
      .then(setAppointments)
      .catch((err) => setAppointmentsError(err.message || 'Unable to load appointments.'))
      .finally(() => setAppointmentsLoading(false))
  }

  async function refreshDoctorImages(profile) {
    replaceObjectUrl(setPhotoUrl, profile.profilePhotoPath ? await fetchDoctorPhotoUrl() : null)
    replaceObjectUrl(setSignatureUrl, profile.hasSignature ? await fetchDoctorSignatureUrl() : null)
  }

  async function loadDoctor() {
    setDoctorLoading(true)
    setDoctorError(null)
    try {
      const profile = await fetchDoctorProfile()
      setDoctor(profile)
      await refreshDoctorImages(profile)
    } catch (err) {
      setDoctorError(err.message || 'Unable to load your profile from the server.')
    } finally {
      setDoctorLoading(false)
    }
  }

  useEffect(() => {
    if (!auth) return
    loadOwners()
    loadDoctor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token])

  useEffect(() => {
    if (!auth) return
    const timeout = setTimeout(loadPatients, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, species, search])

  useEffect(() => {
    if (!auth) return
    loadAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, appointmentStatus])

  async function handleCreate(payload) {
    await createPatient(payload)
    loadOwners()
    loadPatients()
  }

  async function handleUpdate(id, payload) {
    await updatePatient(id, payload)
    loadOwners()
    loadPatients()
  }

  async function handleDelete(id) {
    await deletePatient(id)
    loadPatients()
  }

  async function handleSaveProfile(payload) {
    const { doctor: saved, token } = await saveDoctorProfile(payload)
    setDoctor(saved)
    // A token comes back only when the login email changed, since that email is
    // the JWT subject; adopting it keeps the current session authenticated.
    if (token) applyAuth({ ...auth, token, email: saved.email, name: saved.name })
  }

  async function handleCreateAppointment(payload) {
    await createAppointment(payload)
    loadAppointments()
  }

  async function handleUpdateAppointment(id, payload) {
    await updateAppointment(id, payload)
    loadAppointments()
  }

  async function handleAppointmentStatus(id, status) {
    await setAppointmentStatus(id, status)
    loadAppointments()
  }

  async function handleDeleteAppointment(id) {
    await deleteAppointment(id)
    loadAppointments()
  }

  async function handleToggleVideoConsultation(enabled) {
    setDoctor(await setVideoConsultation(enabled))
    // Room links appear or vanish with the flag, so the list must be re-read.
    loadAppointments()
  }

  async function handleRegenerateVideoRoom() {
    setDoctor(await regenerateVideoRoom())
  }

  async function handleUploadSignature(file) {
    const saved = await uploadDoctorSignature(file)
    setDoctor(saved)
    replaceObjectUrl(setSignatureUrl, await fetchDoctorSignatureUrl())
  }

  async function handleUploadPhoto(file) {
    const saved = await uploadDoctorPhoto(file)
    setDoctor(saved)
    replaceObjectUrl(setPhotoUrl, await fetchDoctorPhotoUrl())
  }

  // A reset link wins over an existing session: whoever opened it is proving
  // ownership of the mailbox and needs the new-password form, not the dashboard.
  if (!auth || resetToken) {
    return (
      <DoctorLoginPage
        onLogin={handleLogin}
        resetToken={resetToken}
        onResetTokenDiscarded={clearResetToken}
        onPasswordReset={handlePasswordReset}
      />
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={auth}
        doctor={doctor}
        photoUrl={photoUrl}
        page={page}
        onNavigate={setPage}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {page === 'appointments' ? (
          <AppointmentsPage
            appointments={appointments}
            patients={patients}
            doctor={doctor}
            loading={appointmentsLoading}
            error={appointmentsError}
            status={appointmentStatus}
            onStatusChange={setAppointmentStatus_}
            onCreate={handleCreateAppointment}
            onUpdate={handleUpdateAppointment}
            onSetStatus={handleAppointmentStatus}
            onDelete={handleDeleteAppointment}
          />
        ) : page === 'profile' ? (
          <DoctorProfilePage
            profile={doctor}
            photoUrl={photoUrl}
            signatureUrl={signatureUrl}
            loading={doctorLoading}
            error={doctorError}
            onSave={handleSaveProfile}
            onUploadPhoto={handleUploadPhoto}
            onUploadSignature={handleUploadSignature}
            onToggleVideoConsultation={handleToggleVideoConsultation}
            onRegenerateVideoRoom={handleRegenerateVideoRoom}
          />
        ) : page === 'prescriptions' ? (
          <PrescriptionsPage
            patients={patients}
            doctor={doctor}
            signatureUrl={signatureUrl}
          />
        ) : page === 'patients' ? (
          <PatientsPage
            patients={patients}
            owners={owners}
            loading={loading}
            error={error}
            species={species}
            search={search}
            onSpeciesChange={setSpecies}
            onSearchChange={setSearch}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ) : (
          <DoctorDashboardPage profile={doctor} photoUrl={photoUrl} onNavigate={setPage} />
        )}
      </main>
    </div>
  )
}

export default App

// Frontend run without backend

// import { useEffect, useState } from "react";
// import Sidebar from "./components/Sidebar";
// import PatientsPage from "./components/PatientsPage";
// import PrescriptionsPage from "./components/PrescriptionsPage";
// import DoctorLoginPage from "./components/DoctorLoginPage";
// import DoctorDashboardPage from "./components/DoctorDashboardPage";
// import DoctorProfilePage from "./components/DoctorProfilePage";
// import {
//   fetchOwners,
//   fetchPatients,
//   createPatient,
//   updatePatient,
//   deletePatient,
//   fetchAppointments,
//   createAppointment,
//   updateAppointment,
//   setAppointmentStatus,
//   deleteAppointment,
//   fetchDoctorProfile,
//   fetchDoctorPhotoUrl,
//   fetchDoctorSignatureUrl,
//   saveDoctorProfile,
//   setVideoConsultation,
//   regenerateVideoRoom,
//   uploadDoctorPhoto,
//   uploadDoctorSignature,
//   setAuthToken,
//   setUnauthorizedHandler,
// } from "./api";
// import "./App.css";

// const AUTH_STORAGE_KEY = "zenve.auth";

// const LANDING_PAGE = "profile";

// const DUMMY_AUTH = {
//   token: "mock-token-xyz",
//   name: "Dr. Chandran",
//   email: "chandran@zenve.com",
// };

// const DUMMY_DOCTOR = {
//   name: "Dr. Chandran",
//   email: "chandran@zenve.com",
//   mobile: "9876543210",
//   specialization: "Veterinary Surgeon & Physician",
//   qualification: "BVSc & AH, MVSc (Surgery)",
//   experience: "8 Years",
//   clinicName: "Zenve Veterinary Clinic",
//   address: "No. 42, Anna Nagar West, Chennai - 600040",
//   consultationFee: 500,
//   workingHours: "Mon - Sat: 09:00 AM - 07:00 PM",
//   videoConsultationAvailable: true,
// };

// const DUMMY_PATIENTS = [
//   { id: 1, petName: "Jimmy (Dog)", ownerName: "Chandran" },
//   { id: 2, petName: "Tommy (Cat)", ownerName: "Kumar" },
// ];

// function App() {
//   const [auth, setAuth] = useState(DUMMY_AUTH);
//   const [resetToken, setResetToken] = useState(null);
//   const [page, setPage] = useState(LANDING_PAGE);
//   const [owners, setOwners] = useState([]);
//   const [patients, setPatients] = useState(DUMMY_PATIENTS);
//   const [species, setSpecies] = useState("All");
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const [appointments, setAppointments] = useState([]);
//   const [appointmentStatus, setAppointmentStatus_] = useState("SCHEDULED");
//   const [appointmentsLoading, setAppointmentsLoading] = useState(false);
//   const [appointmentsError, setAppointmentsError] = useState(null);

//   const [doctor, setDoctor] = useState(DUMMY_DOCTOR);
//   const [doctorLoading, setDoctorLoading] = useState(false);
//   const [doctorError, setDoctorError] = useState(null);
//   const [photoUrl, setPhotoUrl] = useState(null);
//   const [signatureUrl, setSignatureUrl] = useState(null);

//   useEffect(() => {
//     setAuthToken(auth?.token ?? null);
//   }, [auth]);

//   useEffect(() => {
//     setUnauthorizedHandler(handleLogout);
//   }, []);

//   function replaceObjectUrl(setter, next) {
//     setter((prev) => {
//       if (prev) URL.revokeObjectURL(prev);
//       return next;
//     });
//   }

//   function applyAuth(authData) {
//     localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
//     setAuthToken(authData.token);
//     setAuth(authData);
//   }

//   function handleLogin(authData) {
//     applyAuth(authData);
//     setPage(LANDING_PAGE);
//   }

//   function clearResetToken() {
//     setResetToken(null);
//     window.history.replaceState(null, "", window.location.pathname);
//   }

//   function handlePasswordReset() {
//     clearResetToken();
//     if (auth) handleLogout();
//   }

//   function handleLogout() {
//     localStorage.removeItem(AUTH_STORAGE_KEY);
//     setAuth(null);
//     setDoctor(null);
//     replaceObjectUrl(setPhotoUrl, null);
//     replaceObjectUrl(setSignatureUrl, null);
//     setPage(LANDING_PAGE);
//   }

//   function loadOwners() {
//     fetchOwners()
//       .then(setOwners)
//       .catch(() => {});
//   }

//   function loadPatients() {
//     setLoading(true);
//     fetchPatients({ species, search })
//       .then(setPatients)
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }

//   function loadAppointments() {
//     setAppointmentsLoading(true);
//     fetchAppointments({ status: appointmentStatus })
//       .then(setAppointments)
//       .catch(() => {})
//       .finally(() => setAppointmentsLoading(false));
//   }

//   async function loadDoctor() {
//     try {
//       const profile = await fetchDoctorProfile();
//       setDoctor(profile);
//     } catch {
//     }
//   }

//   useEffect(() => {
//     if (!auth) return;
//     loadOwners();
//     loadDoctor();
//   }, [auth?.token]);

//   async function handleCreate(payload) {
//     await createPatient(payload);
//     loadOwners();
//     loadPatients();
//   }

//   async function handleUpdate(id, payload) {
//     await updatePatient(id, payload);
//     loadOwners();
//     loadPatients();
//   }

//   async function handleDelete(id) {
//     await deletePatient(id);
//     loadPatients();
//   }

//   async function handleSaveProfile(payload) {
//     setDoctor(payload);
//     alert("Doctor Profile updated successfully (Local State)!");
//   }

//   async function handleCreateAppointment(payload) {
//     await createAppointment(payload);
//     loadAppointments();
//   }

//   async function handleUpdateAppointment(id, payload) {
//     await updateAppointment(id, payload);
//     loadAppointments();
//   }

//   async function handleAppointmentStatus(id, status) {
//     await setAppointmentStatus(id, status);
//     loadAppointments();
//   }

//   async function handleDeleteAppointment(id) {
//     await deleteAppointment(id);
//     loadAppointments();
//   }

//   async function handleToggleVideoConsultation(enabled) {
//     setDoctor((prev) => ({ ...prev, videoConsultationAvailable: enabled }));
//   }

//   async function handleRegenerateVideoRoom() {
//     alert("Regenerating video room...");
//   }

//   async function handleUploadSignature(file) {
//     const fakeUrl = URL.createObjectURL(file);
//     replaceObjectUrl(setSignatureUrl, fakeUrl);
//   }

//   async function handleUploadPhoto(file) {
//     const fakeUrl = URL.createObjectURL(file);
//     replaceObjectUrl(setPhotoUrl, fakeUrl);
//   }


//   return (
//     <div className="app-shell">
//       <Sidebar
//         user={auth}
//         doctor={doctor}
//         photoUrl={photoUrl}
//         page={page}
//         onNavigate={setPage}
//         onLogout={handleLogout}
//       />
//       <main className="app-main">
//         {page === "profile" ? (
//           <DoctorProfilePage
//             profile={doctor}
//             photoUrl={photoUrl}
//             signatureUrl={signatureUrl}
//             loading={doctorLoading}
//             error={doctorError}
//             onSave={handleSaveProfile}
//             onUploadPhoto={handleUploadPhoto}
//             onUploadSignature={handleUploadSignature}
//             onToggleVideoConsultation={handleToggleVideoConsultation}
//             onRegenerateVideoRoom={handleRegenerateVideoRoom}
//           />
//         ) : page === "prescriptions" ? (
//           <PrescriptionsPage
//             patients={patients}
//             doctor={doctor}
//             signatureUrl={signatureUrl}
//           />
//         ) : page === "patients" ? (
//           <PatientsPage
//             patients={patients}
//             owners={owners}
//             loading={loading}
//             error={error}
//             species={species}
//             search={search}
//             onSpeciesChange={setSpecies}
//             onSearchChange={setSearch}
//             onCreate={handleCreate}
//             onUpdate={handleUpdate}
//             onDelete={handleDelete}
//           />
//         ) : (
//           <DoctorDashboardPage
//             profile={doctor}
//             photoUrl={photoUrl}
//             onNavigate={setPage}
//           />
//         )}
//       </main>
//     </div>
//   );
// }

// export default App;

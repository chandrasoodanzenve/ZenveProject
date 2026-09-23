import './DoctorDashboardPage.css'

const QUICK_LINKS = [
  { key: 'patients', label: 'Patients', hint: 'Register pets and review their records' },
  { key: 'prescriptions', label: 'Prescriptions', hint: 'Dictate and issue a digital prescription' },
  { key: 'profile', label: 'My profile', hint: 'Clinic details, signature and availability' },
]

function setupItems(profile) {
  return [
    {
      label: 'Contact details',
      done: Boolean(profile?.mobile),
      todo: 'Add a mobile number so you can log in with it',
    },
    {
      label: 'Practice details',
      done: Boolean(profile?.specialization && profile?.qualification && profile?.hospitalName),
      todo: 'Add your specialization, qualification and clinic',
    },
    {
      label: 'Availability',
      done: Boolean(profile?.availability),
      todo: 'Publish your working hours',
    },
    {
      label: 'Digital signature',
      done: Boolean(profile?.hasSignature),
      todo: 'Upload a signature to sign prescriptions',
    },
  ]
}

function DoctorDashboardPage({ profile, photoUrl, onNavigate }) {
  const items = setupItems(profile)
  const pending = items.filter((item) => !item.done)
  const initials = (profile?.name || profile?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt="" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>
        <div className="dashboard-hero-body">
          <h2>Welcome back, {profile?.name || 'Doctor'}</h2>
          <p>
            {[profile?.specialization, profile?.hospitalName].filter(Boolean).join(' · ') ||
              'Finish your profile so it shows on prescriptions and booking pages.'}
          </p>
        </div>
        <span
          className={`dashboard-badge${profile?.videoConsultationEnabled ? ' is-on' : ''}`}
        >
          Video consultation {profile?.videoConsultationEnabled ? 'ON' : 'OFF'}
        </span>
      </header>

      <section className="dashboard-card">
        <div className="dashboard-card-head">
          <h3>Profile setup</h3>
          <span className="dashboard-card-meta">
            {pending.length === 0
              ? 'All set'
              : `${pending.length} item${pending.length === 1 ? '' : 's'} left`}
          </span>
        </div>
        <ul className="dashboard-checklist">
          {items.map((item) => (
            <li key={item.label} className={item.done ? 'is-done' : ''}>
              <span className="dashboard-check" aria-hidden="true">
                {item.done ? '✓' : '•'}
              </span>
              <span className="dashboard-check-body">
                <strong>{item.label}</strong>
                <span>{item.done ? 'Added' : item.todo}</span>
              </span>
            </li>
          ))}
        </ul>
        {pending.length > 0 && (
          <button type="button" className="btn-link" onClick={() => onNavigate('profile')}>
            Complete my profile →
          </button>
        )}
      </section>

      <section className="dashboard-links">
        {QUICK_LINKS.map((link) => (
          <button
            key={link.key}
            type="button"
            className="dashboard-link"
            onClick={() => onNavigate(link.key)}
          >
            <strong>{link.label}</strong>
            <span>{link.hint}</span>
          </button>
        ))}
      </section>
    </div>
  )
}

export default DoctorDashboardPage

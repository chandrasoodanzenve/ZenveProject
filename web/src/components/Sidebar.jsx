import './Sidebar.css'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
 // { key: 'appointments', label: 'Appointments' },
  { key: 'patients', label: 'Patients' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'profile', label: 'My profile' },
]

function Sidebar({ user, doctor, photoUrl, page, onNavigate, onLogout }) {
  const name = doctor?.name || user.name || user.email
  const email = doctor?.email || user.email

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Zenve Doctors</h1>
        <p>Veterinary Practice OS</p>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-nav-item${page === item.key ? ' active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-user"
          onClick={() => onNavigate('profile')}
          title="Open my profile"
        >
          <span className="sidebar-user-avatar">
            {photoUrl ? <img src={photoUrl} alt="" /> : name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="sidebar-user-text">
            <span className="sidebar-user-name">{name}</span>
            <span className="sidebar-user-email">{email}</span>
          </span>
        </button>
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

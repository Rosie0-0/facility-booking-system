import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminNavbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const links = [
    { label: 'Dashboard',     path: '/admin/dashboard' },
    { label: 'Bookings',      path: '/admin/bookings' },
    { label: 'Facilities',    path: '/admin/facilities' },
    { label: 'Users',         path: '/admin/users' },
    { label: 'Penalties',     path: '/admin/penalties' },
    { label: 'Announcements', path: '/admin/announcements' },
  ]

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/admin/dashboard')}
        >
          <img
            src="/inti-logo.png"
            alt="INTI Logo"
            className="h-10 object-contain"
          />
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                location.pathname === link.path
                  ? 'text-red-600'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Admin user */}
        <div className="relative group">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-full px-3 py-1.5 hover:border-red-300">
            <span>{' Admin '}</span>
          </button>
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg hidden group-hover:block">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-medium text-gray-900">{user?.campus_id}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
            >
              Logout
            </button>
          </div>
        </div>

      </div>
    </nav>
  )
}
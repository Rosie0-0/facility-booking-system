import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function StudentNavbar({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function loadUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (active) setUnread(count || 0)
    }
    loadUnread()
    const channel = supabase
      .channel('nav-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, loadUnread)
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [user?.id])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const links = [
    { label: 'Home',          path: '/dashboard' },
    { label: 'My Bookings',   path: '/bookings' },
    { label: 'Announcements', path: '/announcements' },
  ]

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo (left) */}
        <img
          src="/inti-logo.png"
          alt="INTI International College Penang"
          className="h-9 object-contain cursor-pointer"
          onClick={() => navigate('/dashboard')}
        />

        {/* Links + user (right) */}
        <div className="flex items-center gap-4 md:gap-7">
          {links.map(l => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className={`text-sm font-medium transition ${
                location.pathname === l.path ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
              }`}
            >
              {l.label}
            </button>
          ))}

          {/* Notifications bell */}
          <button
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            className="relative text-gray-600 hover:text-red-600 text-xl"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* User icon + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Account"
              className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold overflow-hidden"
            >
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : getInitials(user?.full_name)}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                  {/* Personal info → full profile */}
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile') }}
                    className="w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.campus_id}</p>
                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      <p className="truncate">✉️ {user?.campus_email || '—'}</p>
                      <p>📞 {user?.phone || '—'}</p>
                    </div>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    🚪 Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

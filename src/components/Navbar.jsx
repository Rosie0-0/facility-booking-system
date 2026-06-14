import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar({ user }) {
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) fetchUnreadCount()

    //Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'notifications',
        filter: user ? `user_id=eq.${user.id}` :undefined
      }, () => {
        fetchUnreadCount()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function fetchUnreadCount() {
    const {count} = await supabase
      .from('notifications')
      .select('*', {count: 'exact', head: true})
      .eq('user_id', user.id)
      .eq('is_read', false)

     setUnreadCount(count || 0) 
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function scrollToFooter() {
    document.getElementById('footer').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/inti-logo.png"
            alt="INTI Logo"
            className="h-10 object-contain"
          />
        </div>

        {/* Center title */}
        <div className="hidden md:flex items-center">
          <span className="text-sm font-medium text-gray-500">
            Campus Facility Booking & Management
          </span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/facilities')}
            className="text-sm text-gray-600 hover:text-red-600 font-medium"
          >
            Facilities
          </button>
          <button
            onClick={() => navigate('/bookings')}
            className="text-sm text-gray-600 hover:text-red-600 font-medium"
          >
            Bookings
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="text-sm text-gray-600 hover:text-red-600 font-medium"
          >
            Notification
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={scrollToFooter}
            className="text-sm text-gray-600 hover:text-red-600 font-medium"
          >
            Contact Us
          </button>

          {/* User dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-full px-3 py-1.5 hover:border-red-300">
              <span>{user?.campus_id}</span>
            </button>
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg hidden group-hover:block">
              <button
                onClick={() => navigate('/profile')}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                My Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

      </div>
    </nav>
  )
}
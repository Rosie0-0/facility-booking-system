import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const campusImg = '/campus.jpg'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [bookingCounts, setBookingCounts] = useState({
    pending: 0,
    booked: 0,
    history: 0
  })
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) getBookingCounts()
  }, [user])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    setUser(data)
  }

  async function getBookingCounts() {
    const { data } = await supabase
      .from('bookings')
      .select('status')
      .eq('user_id', user.id)

    if (data) {
      setBookingCounts({
        pending: data.filter(b => b.status === 'pending').length,
        booked:  data.filter(b => b.status === 'approved').length,
        history: data.filter(b => ['rejected', 'cancelled'].includes(b.status)).length
      })
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function scrollToFooter() {
    document.getElementById('footer').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">INTI</p>
              <p className="text-gray-400 text-xs">International College Penang</p>
            </div>
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
                <span>{'< '}{user?.campus_id}{' >'}</span>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg hidden group-hover:block">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
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

      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={campusImg}
          alt="INTI Campus"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-center px-12">
          <h1 className="text-white text-4xl font-bold leading-tight">
            Welcome to INTI Facility<br />Booking Portal
          </h1>
          <p className="text-gray-200 mt-2 text-sm">
            Reserve campus facilities easily and efficiently.
          </p>
        </div>

        {/* Booking status tabs */}
        <div className="absolute bottom-0 left-12 flex gap-2">
          {['pending', 'booked', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-medium capitalize rounded-t-lg transition ${
                activeTab === tab
                  ? 'bg-white text-red-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Booking counts */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {bookingCounts.pending}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {bookingCounts.booked}
              </p>
              <p className="text-xs text-gray-500 mt-1">Booked</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">
                {bookingCounts.history}
              </p>
              <p className="text-xs text-gray-500 mt-1">History</p>
            </div>
          </div>
        </div>

        {/* Welcome message */}
        {user && (
          <p className="text-gray-600 mb-6 text-sm">
            Welcome back, <span className="font-semibold text-gray-900">{user.full_name}</span>!
          </p>
        )}

        {/* Quick action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Quick Booking */}
          <div
            onClick={() => navigate('/facilities')}
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition border border-transparent hover:border-red-200"
          >
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Quick Booking</h3>
            <p className="text-sm text-gray-500">
              Make a new booking with a few simple steps.
            </p>
          </div>

          {/* My Bookings */}
          <div
            onClick={() => navigate('/bookings')}
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition border border-transparent hover:border-blue-200"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">My Bookings</h3>
            <p className="text-sm text-gray-500">
              View your upcoming and past bookings.
            </p>
          </div>

          {/* Facilities */}
          <div
            onClick={() => navigate('/facilities')}
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition border border-transparent hover:border-green-200"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Facilities</h3>
            <p className="text-sm text-gray-500">
              Explore and book available facilities.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer id="footer" className="bg-gray-900 text-white mt-16 py-10">
        <div className="max-w-7xl mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">I</span>
              </div>
              <div>
                <p className="font-bold text-sm">INTI</p>
                <p className="text-gray-400 text-xs">International College Penang</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Campus Facility Booking & Management System
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li
                className="hover:text-white cursor-pointer"
                onClick={() => navigate('/facilities')}
              >
                Facilities
              </li>
              <li
                className="hover:text-white cursor-pointer"
                onClick={() => navigate('/bookings')}
              >
                My Bookings
              </li>
              <li
                className="hover:text-white cursor-pointer"
                onClick={() => navigate('/notifications')}
              >
                Notifications
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Contact Us</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📍 Lebuh Bukit Jambul, 11900 Penang</li>
              <li>📞 +604-630 8888</li>
              <li>✉️ info@newinti.edu.my</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs text-gray-500">
          © 2026 INTI International College Penang. All Rights Reserved.
        </div>
      </footer>

    </div>
  )
}
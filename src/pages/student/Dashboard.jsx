import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

const campusImg = '/Inti-campus.jpg'

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
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Reusable Navbar Component */}
      <Navbar user={user} />

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
          {[
            {label: 'Pending', tab: 'pending' },
            {label: 'Booked', tab: 'upcoming'},
            {label: 'History', tab: 'completed'},
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => navigate(`/bookings?tab=${item.tab}`)}
              className="px-6 py-2 text-sm font-medium capitalize rounded-t-lg transition bg-white/20 text-white hover:bg-white/30"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex-1">

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

      {/* Reusable Footer Component */}
      <Footer />

    </div>
  )
}
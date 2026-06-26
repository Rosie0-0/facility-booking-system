import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName } from '../../lib/facilityImages'
import AdminNavbar from '../../components/AdminNavbar'
import BookingDetailPopup from '../../components/BookingDetailPopup'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function formatTime(datetime) {
  if (!datetime) return '—'
  return new Date(datetime).toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}

const statusColors = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}



export default function AdminDashboard() {
  const navigate = useNavigate()
  const [user, setUser]       = useState(null)
  const [checking, setChecking] = useState(true)
  const [stats, setStats]     = useState({
    totalBookings: 0,
    pending:       0,
    approved:      0,
    totalUsers:    0,
    totalFacilities: 0,
  })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      getStats()
      getRecentBookings()
    }
  }, [user])

  async function getUser() {
    setChecking(true)
    
    const { data: { user: authUser }, error:authError } = 
      await supabase.auth.getUser()

    if (authError || !authUser) { 
      navigate('/', {replace: true});
      return 
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !data) {
      navigate('/', {replace: true});
      return
    }

    if (data?.role !== 'admin') { 
      navigate('/dashboard', { replace: true});
      return 
    }
    setUser(data)
    setChecking(false)
  }

  async function getStats() {
    const [
      totalBookings,
      pending,
      approved,
      totalUsers,
      totalFacilities
    ] = await Promise.all([
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('facilities').select('facility_id', { count: 'exact', head: true }),
    ])

    setStats({
      totalBookings:   totalBookings.count   || 0,
      pending:         pending.count         || 0,
      approved:        approved.count        || 0,
      totalUsers:      totalUsers.count      || 0,
      totalFacilities: totalFacilities.count || 0,
    })
  }

  async function getRecentBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, facilities(facility_name, location, requires_payment, price_per_booking), payments(payment_status)')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Recent bookings:', data)
    setRecentBookings(data || [])
    setLoading(false)
  }

  const statCards = [
    { label: 'Total Bookings',  value: stats.totalBookings,   color: 'text-blue-600',   bg: 'bg-blue-100',   icon: '📋' },
    { label: 'Pending',         value: stats.pending,         color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '⏳' },
    { label: 'Approved',        value: stats.approved,        color: 'text-green-600',  bg: 'bg-green-100',  icon: '✅' },
    { label: 'Total Users',     value: stats.totalUsers,      color: 'text-purple-600', bg: 'bg-purple-100', icon: '👥' },
    { label: 'Facilities',      value: stats.totalFacilities, color: 'text-red-600',    bg: 'bg-red-100',    icon: '🏢' },
  ]

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.full_name}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map(stat => (
            <div key={stat.label} className={`rounded-xl shadow-sm p-5 ${stat.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Manage Bookings',  path: '/admin/bookings'},
            { label: 'Manage Facilities', path: '/admin/facilities'},
            { label: 'Manage Users',     path: '/admin/users' },
            { label: 'Announcements',    path: '/admin/announcements'},
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`${action.color} hover:bg-gray-200 text-gray-600 rounded-xl p-4 text-sm font-semibold text-left transition shadow-md`}
            >
              {action.label} →
            </button>
          ))}
        </div>

        {/* Recent bookings table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="text-sm text-red-600 hover:underline"
            >
              View All
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                recentBookings.map(booking => (
                  <tr key={booking.booking_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{booking.booked_name}</p>
                      <p className="text-xs text-gray-400">{booking.booked_campus_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {formatFacilityName(booking.facilities?.facility_name)}
                      </p>
                      <p className="text-xs text-gray-400">{booking.facilities?.location}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(booking.booking_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {booking.facilities?.facility_name === 'event_area'
                        ? 'Full day'
                        : `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[booking.status]}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { 
                          console.log('Selected booking:', booking)
                          setSelectedBooking(booking)}}
                        // onClick={() => setSelectedBooking(booking)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {selectedBooking && (
                        <BookingDetailPopup
                          booking={selectedBooking}
                          adminUser={user}
                          onClose={() => setSelectedBooking(null)}
                          onUpdate={(bookingId, updates) => {
                            setRecentBookings(prev => prev.map(b =>
                              b.booking_id === bookingId ? { ...b, ...updates } : b
                            ))
                          }}

                          onRefresh={async () => {
                            await getStats()
                            await getRecentBookings()
                          }}
                        />
        )}
      </div>
    </div>
  )
}
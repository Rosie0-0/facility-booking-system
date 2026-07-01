import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName } from '../../lib/facilityImages'
import AdminNavbar from '../../components/AdminNavbar'
import BookingDetailPopup from '../../components/BookingDetailPopup'

const PAGE_SIZE = 10
// const location = useLocation()

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

const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled']

export default function ManageBookings() {
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage]         = useState(1)
  const [hasMore, setHasMore]   = useState(false)
  const [counts, setCounts]     = useState({
    all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0
  })
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [actionLoading, setActionLoading]     = useState(false)

  useEffect(() => { getUser() }, [])
  useEffect(() => {
    if (user) { setPage(1); setBookings([]); getBookings(1, true) }
  }, [user, activeTab])
  //Manage button navigation from dashboard
  // useEffect(() => {
  //   if (!location.state?.bookingId) return
  //   if (bookings.length === 0) return

  //   const booking = bookings.find(b => b.booking_id === location.state.bookingId)

  //   if (booking) {
  //     setSelectedBooking(booking)
  //   }
  // }, [bookings, location.state])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }

    const { data } = await supabase
      .from('admins').select('*').eq('id', authUser.id).single()

    if (!data) { navigate('/'); return }
    setUser(data)
  }

  async function getBookings(pageNum = 1, reset = false) {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('bookings')
      .select('*, facilities(facility_name, location, requires_payment, price_per_booking), payments(payment_status)')
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1)

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab)
    }

    const { data } = await query
    setBookings(prev => reset ? data || [] : [...prev, ...(data || [])])
    setHasMore((data || []).length === PAGE_SIZE)

    if (reset) await getCounts()
    setLoading(false)
  }

  async function getCounts() {
    const [all, pending, approved, rejected, cancelled] = await Promise.all([
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('bookings').select('booking_id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    ])
    setCounts({
      all:       all.count       || 0,
      pending:   pending.count   || 0,
      approved:  approved.count  || 0,
      rejected:  rejected.count  || 0,
      cancelled: cancelled.count || 0,
    })
  }

  async function handleApprove(bookingId) {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'approved' })
      .eq('booking_id', bookingId)

    if (!error) {
      // Send notification to student
      const booking = bookings.find(b => b.booking_id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Booking Approved',
        message: `Your booking for ${formatFacilityName(booking.facilities?.facility_name)} on ${formatDate(booking.booking_date)} has been approved.`,
        type:    'booking'
      })

      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status: 'approved' } : b
      ))
      setSelectedBooking(null)
      await getCounts()
    }
    setActionLoading(false)
  }

  async function handleReject(bookingId) {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('booking_id', bookingId)

    if (!error) {
      // Send notification to student
      const booking = bookings.find(b => b.booking_id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Booking Rejected',
        message: `Your booking for ${formatFacilityName(booking.facilities?.facility_name)} on ${formatDate(booking.booking_date)} has been rejected.`,
        type:    'booking'
      })

      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status: 'rejected' } : b
      ))
      setSelectedBooking(null)
      await getCounts()
    }
    setActionLoading(false)
  }

  async function handleAttendance(bookingId, status) {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ 
        attendance_status: status,
        checked_by: user.id
      })
      .eq('booking_id', bookingId)

    if (!error) {
      // If no show — create penalty
      if (status === 'no_show') {
        const booking = bookings.find(b => b.booking_id === bookingId)
        await supabase.from('penalties').insert({
          user_id:    booking.user_id,
          booking_id: bookingId,
          reason:     'no_show',
          status:     'active',
        })

        await supabase.from('notifications').insert({
          user_id: booking.user_id,
          title:   'Penalty Issued',
          message: `A no_show penalty has been issued to your account for missing your booking on ${formatDate(booking.booking_date)}.`,
          type:    'penalty'
        })
      }

      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, attendance_status: status } : b
      ))
      setSelectedBooking(null)
    }
    setActionLoading(false)
  }

  async function handleMarkPaid(bookingId) {
    setActionLoading(true)
    const { error } = await supabase
      .from('payments')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('booking_id', bookingId)

    if (!error) {
      const booking = bookings.find(b => b.booking_id === bookingId)
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Payment Confirmed',
        message: `Your payment for ${formatFacilityName(booking.facilities?.facility_name)} booking has been confirmed.`,
        type:    'payment'
      })
      setSelectedBooking(null)
    }
    setActionLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Bookings</h1>

        {/* Counts */}
        <div className="flex flex-wrap gap-4 mb-6">
          {TABS.map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer transition border-2 ${
                activeTab === tab ? 'border-red-500' : 'border-transparent'
              }`}
            >
              <p className="text-xl font-bold text-gray-900">{counts[tab]}</p>
              <p className="text-xs text-gray-500 capitalize mt-1">{tab}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No bookings found.</td></tr>
              ) : (
                bookings.map(booking => (
                  <tr key={booking.booking_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{booking.booked_name}</p>
                      <p className="text-xs text-gray-400">{booking.booked_campus_id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatFacilityName(booking.facilities?.facility_name)}</p>
                      <p className="text-xs text-gray-400">{booking.facilities?.location}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {booking.facilities?.facility_name === 'event_area'
                        ? `${formatDate(booking.booking_date)} – ${formatDate(booking.end_date)}`
                        : formatDate(booking.booking_date)
                      }
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
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        booking.attendance_status === 'present' ? 'bg-green-100 text-green-700' :
                        booking.attendance_status === 'no_show' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {booking.attendance_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedBooking(booking)}
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

          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-100 text-center">
              <button
                onClick={() => { const next = page + 1; setPage(next); getBookings(next) }}
                disabled={loading}
                className="text-sm text-red-600 hover:underline font-medium disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Booking detail popup */}
      {selectedBooking && (
        <BookingDetailPopup
          booking={selectedBooking}
          adminUser={user}
          onClose={() => setSelectedBooking(null)}
          onUpdate={(bookingId, updates) => {
            setBookings(prev => prev.map(b =>
              b.booking_id === bookingId ? { ...b, ...updates } : b
            ))
            getCounts()
          }}
        />
      )}
    </div>
  )
}
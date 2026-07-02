import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName } from '../../lib/facilityImages'
import AdminNavbar from '../../components/AdminNavbar'
import BookingDetailPopup from '../../components/BookingDetailPopup'
import AdminBookingModal from '../../components/AdminBookingModal'

const PAGE_SIZE = 10

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(datetime) {
  if (!datetime) return '—'
  return new Date(datetime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const statusColors = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  released:  'bg-orange-100 text-orange-700',
}

const TABS = ['all', 'pending', 'confirmed', 'rejected', 'cancelled', 'released']

export default function ManageBookings() {
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all')
  const [page, setPage]         = useState(1)
  const [hasMore, setHasMore]   = useState(false)
  const [counts, setCounts]     = useState({
    all: 0, pending: 0, confirmed: 0, rejected: 0, cancelled: 0, released: 0,
  })
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { getUser() }, [])
  useEffect(() => { setActiveTab(searchParams.get('tab') || 'all') }, [searchParams])
  useEffect(() => {
    if (user) { setPage(1); setBookings([]); getBookings(1, true) }
  }, [user, activeTab])

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
      .select('*, facilities(facility_name, location, requires_payment, price_per_booking, requires_approval, booking_mode), payments(payment_status)')
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
    const base = () => supabase.from('bookings').select('booking_id', { count: 'exact', head: true })
    const [all, pending, confirmed, rejected, cancelled, released] = await Promise.all([
      base(),
      base().eq('status', 'pending'),
      base().eq('status', 'confirmed'),
      base().eq('status', 'rejected'),
      base().eq('status', 'cancelled'),
      base().eq('status', 'released'),
    ])
    setCounts({
      all:       all.count       || 0,
      pending:   pending.count   || 0,
      confirmed: confirmed.count || 0,
      rejected:  rejected.count  || 0,
      cancelled: cancelled.count || 0,
      released:  released.count  || 0,
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
          <button
            onClick={() => setShowNew(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            + New Booking
          </button>
        </div>

        {/* Counts */}
        <div className="flex flex-wrap gap-3 mb-6">
          {TABS.map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[90px] bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer transition border-2 ${
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
                bookings.map(booking => {
                  const isEvent = booking.facilities?.booking_mode === 'event'
                  return (
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
                        {isEvent
                          ? `${formatDate(booking.booking_date)} – ${formatDate(booking.end_date)}`
                          : formatDate(booking.booking_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {isEvent ? 'Full day' : `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[booking.status]}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEvent ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                            booking.attendance_status === 'present' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {booking.attendance_status}
                          </span>
                        )}
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
                  )
                })
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

      {selectedBooking && (
        <BookingDetailPopup
          booking={selectedBooking}
          adminUser={user}
          onClose={() => setSelectedBooking(null)}
          onUpdate={(bookingId, updates) => {
            setBookings(prev => prev.map(b =>
              b.booking_id === bookingId ? { ...b, ...updates } : b
            ))
          }}
          onRefresh={async () => { await getBookings(1, true) }}
        />
      )}

      {showNew && user && (
        <AdminBookingModal
          adminUser={user}
          onClose={() => setShowNew(false)}
          onCreated={() => getBookings(1, true)}
        />
      )}
    </div>
  )
}

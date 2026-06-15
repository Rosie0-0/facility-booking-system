import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName } from '../../lib/facilityImages'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

const TABS = ['all', 'pending', 'upcoming', 'completed', 'cancelled', 'rejected']
const PAGE_SIZE = 10

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
  upcoming:  'bg-blue-100 text-blue-700',
  completed: 'bg-purple-100 text-purple-700',
}

function getDisplayStatus(booking) {
  if (booking.status === 'approved') {
    const now = new Date()
    const end = new Date(booking.end_time)
    return end > now ? 'upcoming' : 'completed'
  }
  return booking.status
}

export default function MyBookings() {
  const navigate = useNavigate()
  const [user, setUser]           = useState(null)
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all')
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(false)
  const [counts, setCounts]       = useState({
    pending: 0, upcoming: 0, completed: 0, cancelled: 0, rejected: 0
  })

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
  setActiveTab(searchParams.get('tab') || 'all')
  }, [searchParams])

  useEffect(() => {
    if (user) {
      setPage(1)
      setBookings([])
      getBookings(1, true)
    }
  }, [user, activeTab])

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

  async function getBookings(pageNum = 1, reset = false) {
    setLoading(true)

    let query = supabase
      .from('bookings')
      .select(`*, facilities(facility_name, location)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1)

    // Filter by tab
    if (activeTab === 'pending') {
      query = query.eq('status', 'pending')
    } else if (activeTab === 'upcoming') {
      query = query.eq('status', 'approved').gt('end_time', new Date().toISOString())
    } else if (activeTab === 'completed') {
      query = query.eq('status', 'approved').lte('end_time', new Date().toISOString())
    } else if (activeTab === 'cancelled') {
      query = query.eq('status', 'cancelled')
    } else if (activeTab === 'rejected') {
      query = query.eq('status', 'rejected')
    }

    const { data, error } = await query

    if (!error && data) {
      setBookings(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    }

    // Get counts for stats
    if (reset) await getCounts()

    setLoading(false)
  }

  async function getCounts() {
    const now = new Date().toISOString()

    const [pending, upcoming, completed, cancelled, rejected] = await Promise.all([
      supabase.from('bookings').select('booking_id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'pending'),
      supabase.from('bookings').select('booking_id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'approved').gt('end_time', now),
      supabase.from('bookings').select('booking_id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'approved').lte('end_time', now),
      supabase.from('bookings').select('booking_id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'cancelled'),
      supabase.from('bookings').select('booking_id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'rejected'),
    ])

    setCounts({
      pending:   pending.count || 0,
      upcoming:  upcoming.count || 0,
      completed: completed.count || 0,
      cancelled: cancelled.count || 0,
      rejected:  rejected.count || 0,
    })
  }

  async function handleCancel(bookingId) {
    const confirm = window.confirm('Are you sure you want to cancel this booking?')
    if (!confirm) return

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)

    if (!error) {
      setBookings(prev => prev.map(b =>
        b.booking_id === bookingId ? { ...b, status: 'cancelled' } : b
      ))
      await getCounts()
    }
  }

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    getBookings(nextPage)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mb-8">
          {[
            { label: 'Pending',   count: counts.pending,   color: 'text-yellow-600', tab: 'pending' },
            { label: 'Upcoming',  count: counts.upcoming,  color: 'text-blue-600',   tab: 'upcoming' },
            { label: 'Completed', count: counts.completed, color: 'text-purple-600', tab: 'completed' },
            { label: 'Cancelled', count: counts.cancelled, color: 'text-gray-500',   tab: 'cancelled' },
            { label: 'Rejected',  count: counts.rejected,  color: 'text-red-600',    tab: 'rejected' },
          ].map(stat => (
            <div
              key={stat.tab}
              onClick={() => setActiveTab(stat.tab)}
              className={`flex-1 min-w-[120px] bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer hover:shadow-md transition border-2 ${
                activeTab === stat.tab ? 'border-red-500' : 'border-transparent'
              }`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
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
                <th className="text-left px-6 py-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Facility</th>
                <th className="text-left px-6 py-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-5 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map(booking => {
                  const displayStatus = getDisplayStatus(booking)
                  const isEventArea = booking.facilities?.facility_name === 'event_area'
                  const canCancel = ['pending', 'approved'].includes(booking.status)

                  return (
                    <tr key={booking.booking_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-gray-900">
                          {formatFacilityName(booking.facilities?.facility_name)}
                        </p>
                        <p className="text-xs text-gray-400">{booking.facilities?.location}</p>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700">
                        {isEventArea
                          ? `${formatDate(booking.booking_date)} – ${formatDate(booking.end_date)}`
                          : formatDate(booking.booking_date)
                        }
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-700">
                        {isEventArea
                          ? 'Full day'
                          : `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
                        }
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[displayStatus]}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/bookings/${booking.booking_id}`)}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            View
                          </button>
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(booking.booking_id)}
                              className="text-xs text-red-500 hover:underline font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Load more */}
          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-100 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="text-sm text-red-600 hover:underline font-medium disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>

      </div>

      <Footer />
    </div>
  )
}
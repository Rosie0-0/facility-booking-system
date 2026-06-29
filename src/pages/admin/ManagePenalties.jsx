import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName } from '../../lib/facilityImages'
import AdminNavbar from '../../components/AdminNavbar'

const TABS = ['all', 'active', 'lifted']

const reasonOptions = [
  { value: 'no_show',           label: 'No Show' },
  { value: 'late_cancellation', label: 'Late Cancellation' },
  { value: 'misuse',            label: 'Misuse' },
  { value: 'damage',            label: 'Damage' },
]

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function ManagePenalties() {
  const navigate = useNavigate()
  const [user, setUser]           = useState(null)
  const [penalties, setPenalties] = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [counts, setCounts]       = useState({ all: 0, active: 0, lifted: 0 })

  // Issue penalty states
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [searchId, setSearchId]           = useState('')
  const [foundUser, setFoundUser]         = useState(null)
  const [userBookings, setUserBookings]   = useState([])
  const [userPenalties, setUserPenalties] = useState([])
  const [selectedBooking, setSelectedBooking] = useState('')
  const [selectedReason, setSelectedReason]   = useState('no_show')
  const [issueLoading, setIssueLoading]       = useState(false)
  const [searchLoading, setSearchLoading]     = useState(false)
  const [issueResult, setIssueResult]         = useState(null) // 'warning1' | 'warning2' | 'penalty'

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) { getPenalties(); getCounts() } }, [user, activeTab])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (!data || data.role !== 'admin') { navigate('/'); return }
    setUser(data)
  }

  async function getPenalties() {
    setLoading(true)
    let query = supabase
      .from('penalties')
      .select('*, users(full_name, campus_id), bookings(booking_date, facility_id, facilities(facility_name))')
      .order('created_at', { ascending: false })

    if (activeTab === 'active') query = query.eq('status', 'active')
    if (activeTab === 'lifted') query = query.eq('status', 'lifted')

    const { data, error } = await query
    console.log('penalties data:', data)  // ← add this
    console.log('penalties error:', error)
    setPenalties(data || [])
    setLoading(false)
  }

  async function getCounts() {
    const [all, active, lifted] = await Promise.all([
      supabase.from('penalties').select('penalty_id', { count: 'exact', head: true }),
      supabase.from('penalties').select('penalty_id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('penalties').select('penalty_id', { count: 'exact', head: true }).eq('status', 'lifted'),
    ])
    setCounts({
      all:    all.count    || 0,
      active: active.count || 0,
      lifted: lifted.count || 0,
    })
  }

  async function handleLift(penaltyId) {
    await supabase.from('penalties').update({ status: 'lifted' }).eq('penalty_id', penaltyId)
    setPenalties(prev => prev.map(p =>
      p.penalty_id === penaltyId ? { ...p, status: 'lifted' } : p
    ))
    await getCounts()
  }

  async function searchUser() {
    if (!searchId.trim()) return
    setSearchLoading(true)
    setFoundUser(null)
    setUserBookings([])
    setUserPenalties([])
    setIssueResult(null)

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('campus_id', searchId.trim().toUpperCase())
      .single()

    if (!userData) {
      setSearchLoading(false)
      return
    }

    setFoundUser(userData)

    // Get user's approved bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, facilities(facility_name)')
      .eq('user_id', userData.id)
      .eq('status', 'approved')
      .order('booking_date', { ascending: false })

    setUserBookings(bookings || [])

    // Get user's active penalties count
    const { data: penaltyData } = await supabase
      .from('penalties')
      .select('*')
      .eq('user_id', userData.id)
      .eq('status', 'active')

    setUserPenalties(penaltyData || [])
    setSearchLoading(false)
  }

  async function handleIssue() {
    if (!foundUser) return
    setIssueLoading(true)

    const activePenaltyCount = userPenalties.length

    if (activePenaltyCount === 0) {
      // First violation — send warning 1
      await supabase.from('notifications').insert({
        user_id: foundUser.id,
        title:   '⚠️ First Warning',
        message: `This is your first warning regarding ${selectedReason.replace('_', ' ')}. Please ensure you follow the facility booking rules. Further violations may result in penalties.`,
        type:    'penalty'
      })
      setIssueResult('warning1')

    } else if (activePenaltyCount === 1) {
      // Second violation — send warning 2
      await supabase.from('notifications').insert({
        user_id: foundUser.id,
        title:   '⚠️ Second Warning',
        message: `This is your second and final warning regarding ${selectedReason.replace('_', ' ')}. One more violation will result in a booking restriction being applied to your account.`,
        type:    'penalty'
      })
      setIssueResult('warning2')

    } else {
      // Third violation — apply actual penalty
      await supabase.from('penalties').insert({
        user_id:    foundUser.id,
        booking_id: selectedBooking || null,
        reason:     selectedReason,
        status:     'active',
      })

      await supabase.from('notifications').insert({
        user_id: foundUser.id,
        title:   '🚫 Penalty Issued',
        message: `A penalty has been issued to your account for ${selectedReason.replace('_', ' ')}. Your booking access has been restricted. Please contact admin for assistance.`,
        type:    'penalty'
      })
      setIssueResult('penalty')
      await getPenalties()
      await getCounts()
    }

    setIssueLoading(false)
  }

  function resetIssueForm() {
    setShowIssueForm(false)
    setSearchId('')
    setFoundUser(null)
    setUserBookings([])
    setUserPenalties([])
    setSelectedBooking('')
    setSelectedReason('no_show')
    setIssueResult(null)
  }

  const reasonColors = {
    no_show:           'bg-orange-100 text-orange-700',
    late_cancellation: 'bg-yellow-100 text-yellow-700',
    misuse:            'bg-red-100 text-red-700',
    damage:            'bg-purple-100 text-purple-700',
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Penalties</h1>
          <button
            onClick={() => setShowIssueForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            + Issue Penalty
          </button>
        </div>

        {/* Counts */}
        <div className="flex flex-wrap gap-4 mb-6">
          {[
            { tab: 'all',    label: 'All',    color: 'text-gray-700' },
            { tab: 'active', label: 'Active', color: 'text-red-600' },
            { tab: 'lifted', label: 'Lifted', color: 'text-green-600' },
          ].map(stat => (
            <div
              key={stat.tab}
              onClick={() => setActiveTab(stat.tab)}
              className={`flex-1 min-w-[100px] bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer transition border-2 ${
                activeTab === stat.tab ? 'border-red-500' : 'border-transparent'
              }`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{counts[stat.tab]}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
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

        {/* Penalties Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Issued</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Lifts On</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
              ) : penalties.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No penalties found.</td></tr>
              ) : (
                penalties.map(p => (
                  <tr key={p.penalty_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{p.users?.full_name}</p>
                      <p className="text-xs text-gray-400">{p.users?.campus_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {p.bookings
                        ? `${formatFacilityName(p.bookings?.facilities?.facility_name)} — ${formatDate(p.bookings?.booking_date)}`
                        : '—'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${reasonColors[p.reason]}`}>
                        {p.reason?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        p.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(p.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDate(p.lift_at)}</td>
                    <td className="px-6 py-4">
                      {p.status === 'active' && (
                        <button
                          onClick={() => handleLift(p.penalty_id)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Lift
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Penalty Popup */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Issue Penalty / Warning</h3>
              <button onClick={resetIssueForm} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">

              {/* Result message */}
              {issueResult && (
                <div className={`rounded-lg p-4 text-sm font-medium ${
                  issueResult === 'penalty'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}>
                  {issueResult === 'warning1' && '⚠️ First warning notification sent to user.'}
                  {issueResult === 'warning2' && '⚠️ Second warning notification sent to user.'}
                  {issueResult === 'penalty'  && '🚫 Penalty has been issued to user account.'}
                </div>
              )}

              {!issueResult && (
                <>
                  {/* Search user */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Search by Campus ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchId}
                        onChange={e => setSearchId(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && searchUser()}
                        placeholder="e.g. STU001"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        onClick={searchUser}
                        disabled={searchLoading}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {searchLoading ? '...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* User found */}
                  {foundUser && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-900">{foundUser.full_name}</p>
                        <p className="text-xs text-gray-500">{foundUser.campus_id} · {foundUser.campus_email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Active penalties:</span>
                          <span className={`text-xs font-bold ${
                            userPenalties.length >= 3 ? 'text-red-600' :
                            userPenalties.length >= 1 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {userPenalties.length}
                          </span>
                        </div>

                        {/* Warning indicator */}
                        <div className="mt-2 text-xs">
                          {userPenalties.length === 0 && (
                            <span className="text-blue-600">→ Will send Warning 1</span>
                          )}
                          {userPenalties.length === 1 && (
                            <span className="text-yellow-600">→ Will send Warning 2</span>
                          )}
                          {userPenalties.length >= 2 && (
                            <span className="text-red-600">→ Will apply Penalty</span>
                          )}
                        </div>
                      </div>

                      {/* Select booking */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">
                          Link to Booking (optional)
                        </label>
                        <select
                          value={selectedBooking}
                          onChange={e => setSelectedBooking(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">— No specific booking —</option>
                          {userBookings.map(b => (
                            <option key={b.booking_id} value={b.booking_id}>
                              {formatFacilityName(b.facilities?.facility_name)} — {formatDate(b.booking_date)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select reason */}
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Reason</label>
                        <select
                          value={selectedReason}
                          onChange={e => setSelectedReason(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          {reasonOptions.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {searchId && !foundUser && !searchLoading && (
                    <p className="text-sm text-red-500">User not found. Check the Campus ID.</p>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={resetIssueForm}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                {issueResult ? 'Close' : 'Cancel'}
              </button>
              {!issueResult && foundUser && (
                <button
                  onClick={handleIssue}
                  disabled={issueLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {issueLoading ? 'Processing...' :
                    userPenalties.length === 0 ? 'Send Warning 1' :
                    userPenalties.length === 1 ? 'Send Warning 2' :
                    'Issue Penalty'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
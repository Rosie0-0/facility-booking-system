import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatFacilityName } from '../lib/facilityImages'

function todayMY() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
}

export default function AdminBookingModal({ adminUser, onClose, onCreated }) {
  const [facilities, setFacilities] = useState([])
  const [facilityId, setFacilityId] = useState('')
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [date, setDate]             = useState(todayMY())
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  useEffect(() => { getFacilities() }, [])

  async function getFacilities() {
    const { data } = await supabase
      .from('facilities')
      .select('facility_id, facility_name, opening_time, closing_time')
      .eq('department', adminUser.department)
      .eq('is_available', true)
      .order('facility_name')
    setFacilities(data || [])
    if (data?.length) setFacilityId(data[0].facility_id)
  }

  async function searchUsers() {
    if (!query.trim()) return
    setSearching(true)
    const q = query.trim()
    const { data } = await supabase
      .from('users')
      .select('id, campus_id, full_name, campus_email, phone')
      .or(`campus_id.ilike.%${q}%,full_name.ilike.%${q}%,campus_email.ilike.%${q}%`)
      .limit(8)
    setResults(data || [])
    setSearching(false)
  }

  async function submit() {
    setError('')
    if (!facilityId)    return setError('Please select a facility.')
    if (!selectedUser)  return setError('Please search and select the user.')
    if (!date)          return setError('Please choose a date.')
    if (!startTime || !endTime) return setError('Please enter start and end times.')
    if (endTime <= startTime)   return setError('End time must be after start time.')

    setSaving(true)
    const { data, error: insErr } = await supabase.from('bookings').insert({
      user_id:           selectedUser.id,
      facility_id:       facilityId,
      booking_date:      date,
      start_time:        `${date}T${startTime}:00+08:00`,
      end_time:          `${date}T${endTime}:00+08:00`,
      booked_name:       selectedUser.full_name,
      booked_email:      selectedUser.campus_email,
      booked_contact:    selectedUser.phone,
      booked_campus_id:  selectedUser.campus_id,
      status:            'confirmed',
      attendance_status: 'pending',
    }).select('booking_id').single()

    if (insErr) {
      setError(insErr.code === '23P01'
        ? 'That facility is already booked for the selected time. Choose another slot.'
        : insErr.message)
      setSaving(false)
      return
    }

    const facilityName = facilities.find(f => f.facility_id === facilityId)?.facility_name
    await supabase.from('notifications').insert({
      user_id:    selectedUser.id,
      booking_id: data.booking_id,
      title:      'Booking Created',
      message:    `A booking for ${formatFacilityName(facilityName)} on ${date} (${startTime}–${endTime}) was created for you by the admin.`,
      type:       'booking',
    })

    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New Booking (walk-in)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Facility */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Facility *</label>
            <select
              value={facilityId}
              onChange={e => setFacilityId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {facilities.length === 0 && <option value="">No available facilities</option>}
              {facilities.map(f => (
                <option key={f.facility_id} value={f.facility_id}>{formatFacilityName(f.facility_name)}</option>
              ))}
            </select>
          </div>

          {/* User search */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Book for (search by Campus ID, name or email) *</label>
            {selectedUser ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedUser.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedUser.campus_id} · {selectedUser.campus_email}</p>
                </div>
                <button onClick={() => { setSelectedUser(null); setResults([]) }} className="text-xs text-red-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchUsers()}
                    placeholder="e.g. STU001"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={searchUsers} disabled={searching}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                    {searching ? '...' : 'Search'}
                  </button>
                </div>
                {results.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                    {results.map(u => (
                      <button key={u.id} onClick={() => setSelectedUser(u)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50">
                        <p className="text-sm text-gray-900">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.campus_id} · {u.campus_email}</p>
                      </button>
                    ))}
                  </div>
                )}
                {query && !searching && results.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No matching users. Try another search.</p>
                )}
              </>
            )}
          </div>

          {/* Date & time */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Start Time *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">End Time *</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

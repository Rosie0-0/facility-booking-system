import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName, getFacilityImageUrl } from '../../lib/facilityImages'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

function generateTimeSlots(openingTime, closingTime, maxHours) {
  const slots = []
  if (!openingTime || !closingTime) return slots

  const [openH] = openingTime.split(':').map(Number)
  const [closeH] = closingTime.split(':').map(Number)
  const duration = maxHours || 1

  //Get current hour in Malaysia Time (UTC+8)
  const nowMY = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur'}))
  const currentHour = nowMY.getHours()

  for (let h = openH; h + duration <= closeH; h++) {
    const start = `${String(h).padStart(2, '0')}:00`
    const end   = `${String(h + duration).padStart(2, '0')}:00`
    const isPast = h < currentHour //filter out past slots
    slots.push({ start, end, label: `${start} – ${end}`, isPast })
  }
  return slots
}

export default function BookingForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const facilityId = searchParams.get('facility')

  const [user, setUser]           = useState(null)
  const [facility, setFacility]   = useState(null)
  const [bookedSlots, setBookedSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [penaltyWarning, setPenaltyWarning] = useState(false)
  const [blockedWarning, setBlockedWarning] = useState(false)

  // // Tomorrow's date
  // const tomorrow = new Date()
  // tomorrow.setDate(tomorrow.getDate() + 1)
  // const bookingDate = tomorrow.toISOString().split('T')[0]
  // const bookingDateDisplay = tomorrow.toLocaleDateString('en-MY', {
  //   weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  // })

  // Today's date
  const today = new Date()
  //today.setDate(today.getDate())
  const bookingDate = today.toISOString().split('T')[0]
  const bookingDateDisplay = today.toLocaleDateString('en-MY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  //Event area special booking
  const [eventStartDate, setEventStartDate] = useState('')
  const [eventEndDate, setEventEndDate]     = useState('')

  // Minimum date for event area = 7 days from today
  const minEventDateObj = new Date()
  minEventDateObj.setDate(minEventDateObj.getDate() + 7)
  const minEventDate = minEventDateObj.toISOString().split('T')[0]

  useEffect(() => {
    if (!facilityId) { navigate('/facilities'); return }
    getUser()
    getFacility()
  }, [facilityId])

  useEffect(() => {
    if (facility) getBookedSlots()
  }, [facility])

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

  async function getFacility() {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('facility_id', facilityId)
      .single()

    if (error || !data) { navigate('/facilities'); return }
    setFacility(data)
    setLoading(false)
  }

  async function getBookedSlots() {
    const { data } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('facility_id', facilityId)
      .eq('booking_date', bookingDate)
      .in('status', ['pending', 'approved'])

    if (data) {
      const slots = data.map(b => ({
        start: new Date(b.start_time).getHours(),
        end:   new Date(b.end_time).getHours()
      }))
      setBookedSlots(slots)
    }
  }

  function isSlotBooked(slot) {
    const slotStart = parseInt(slot.start.split(':')[0])
    const slotEnd   = parseInt(slot.end.split(':')[0])
    return bookedSlots.some(b =>
      (slotStart >= b.start && slotStart < b.end) ||
      (slotEnd > b.start && slotEnd <= b.end)
    )
  }

  async function checkPenalties() {
    const { data } = await supabase
      .from('penalties')
      .select('penalty_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    return data ? data.length : 0
  }

  async function handleBooking() {
    //Validation
    if (facility.facility_name === 'event_area') {
      if (!eventStartDate || !eventEndDate){
        setError('Please select both start and end dates.')
        return
      }
      if (eventEndDate < eventStartDate){
        setError('End date must be after start date.')
        return
      }
    }else {
      if (!selectedSlot){
        setError('Please select a time slot.')
        return
      }
    }

    setSubmitting(true)
    setError('')

    // Check penalties
    const penaltyCount = await checkPenalties()

    if (penaltyCount >= 3) {
      setBlockedWarning(true)
      setSubmitting(false)
      return
    }

    if (penaltyCount > 0) {
      setPenaltyWarning(true)
      setSubmitting(false)
      return
    }

    await submitBooking()
  }

  async function submitBooking() {
    setSubmitting(true)

    let startDateTime, endDateTime, bookingDateFinal, endDateFinal

    if(facility.facility_name === 'event_area'){
      startDateTime     = `${eventStartDate}T:08:00:00+08:00`
      endDateTime       = `${eventEndDate}T${facility.closing_time}+08:00`
      bookingDateFinal  = eventStartDate
      endDateFinal      = eventEndDate
    } else {
      startDateTime     = `${bookingDate}T${selectedSlot.start}:00+08:00`
      endDateTime       = `${bookingDate}T${selectedSlot.end}:00+08:00`
      bookingDateFinal  = bookingDate
      endDateFinal      = null
    }

    const { data, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id:          user.id,
        facility_id:      facility.facility_id,
        booking_date:     bookingDateFinal,
        end_date:         endDateFinal,
        start_time:       startDateTime,
        end_time:         endDateTime,
        booked_name:      user.full_name,
        booked_email:     user.campus_email,
        booked_contact:   user.phone,
        booked_campus_id: user.campus_id,
        status:           'pending',
        attendance_status: 'pending'
      })
      .select()
      .single()

    if (bookingError) {
      setError(bookingError.message)
      setSubmitting(false)
      return
    }

    // Navigate to booking confirmation
    navigate(`/bookings/${data.booking_id}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
        <Footer />
      </div>
    )
  }

  const timeSlots = generateTimeSlots(
    facility.opening_time,
    facility.closing_time,
    facility.max_booking_hours
  )

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        {/* Back button */}
        <button
          onClick={() => navigate('/facilities')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 mb-6"
        >
          ← Back to Facilities
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left — Facility details */}
          <div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <img
                src={getFacilityImageUrl(facility.image_path, facility.facility_name)}
                alt={formatFacilityName(facility.facility_name)}
                className="w-full h-56 object-cover"
                onError={e => e.target.src = '/facilities/discussion_room.jpg'}
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {formatFacilityName(facility.facility_name)}
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 capitalize">
                    {facility.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{facility.location}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Capacity</p>
                    <p className="font-medium text-gray-900">
                      {facility.capacity >= 999 ? 'No limit' : facility.capacity}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Max Hours</p>
                    <p className="font-medium text-gray-900">
                      {facility.max_booking_hours ?? 'No limit'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Opening Hours</p>
                    <p className="font-medium text-gray-900">
                      {facility.opening_time?.slice(0,5)} – {facility.closing_time?.slice(0,5)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Fee</p>
                    <p className="font-medium text-gray-900">
                      {facility.requires_payment
                        ? `RM ${Number(facility.price_per_booking).toFixed(2)}`
                        : 'Free'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Booking form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Booking Summary</h3>

            {/* Auto-filled details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Student ID</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{user?.campus_id}</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Name</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{user?.full_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Contact</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{user?.phone || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide">Booking Date</label>
                <p className="text-sm font-medium text-gray-900 mt-1">{bookingDateDisplay}</p>
              </div>
            </div>

            {/* Time slot OR Date range depending on facility */}
            {facility.facility_name === 'event_area' ? (

              /* Event Area — date range picker */
              <div className="mb-6">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-3">
                  Select Event Dates
                </label>
                <p className="text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2 mb-3">
                  ⚠️ Event Area bookings must be made at least 7 days in advance.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      min={minEventDate}
                      value={eventStartDate}
                      onChange={e => setEventStartDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      min={eventStartDate || minEventDate}
                      value={eventEndDate}
                      onChange={e => setEventEndDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

            ) : (

              /* Regular facilities — time slot selector */
              <div className="mb-6">
                <label className="text-xs text-gray-400 uppercase tracking-wide block mb-3">
                  Select Time Slot
                </label>
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-gray-500">No time slots available.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(slot => {
                      const booked   = isSlotBooked(slot) || slot.isPast
                      const selected = selectedSlot?.start === slot.start
                      return (
                        <button
                          key={slot.start}
                          onClick={() => !booked && setSelectedSlot(slot)}
                          disabled={booked}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                            booked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                              : selected
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                          }`}
                        >
                          {slot.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

            )}

            {/* Selected slot summary */}
            {selectedSlot && (
              <div className="bg-red-50 rounded-lg p-3 mb-4 text-sm">
                <p className="text-red-700 font-medium">
                  Selected: {bookingDate} · {selectedSlot.label}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}

            {/* Book Now button */}
            <button
              onClick={handleBooking}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Penalty Warning Popup — has penalties but not blocked */}
      {penaltyWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Penalty Warning</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have active penalties on your account. 
              Please be reminded that 3 penalties will result in a booking restriction.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPenaltyWarning(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { setPenaltyWarning(false); submitBooking() }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Warning Popup — 3+ penalties */}
      {blockedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Booking Blocked</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have 3 or more active penalties. 
              Your account is restricted from making new bookings. 
              Please contact admin to resolve your penalties.
            </p>
            <button
              onClick={() => setBlockedWarning(false)}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
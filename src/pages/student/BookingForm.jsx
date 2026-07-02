import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName, getFacilityImageUrl } from '../../lib/facilityImages'
import { getDepartmentContact } from '../../lib/departmentContacts'
import StudentLayout from '../../components/StudentLayout'
import EventRequestForm from '../../components/EventRequestForm'

// ---- time helpers (minutes from midnight, Malaysia time) ----
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function toHHMM(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}
function myMinutesFromTs(ts) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ts))
  const h = Number(parts.find(p => p.type === 'hour').value)
  const m = Number(parts.find(p => p.type === 'minute').value)
  return h * 60 + m
}
function nowMyMinutes() {
  return myMinutesFromTs(new Date().toISOString())
}
function label12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}
// Malaysia-local calendar date (YYYY-MM-DD) — avoids UTC date drift
function myDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(d)
}

export default function BookingForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const facilityId = searchParams.get('facility')

  const [user, setUser]             = useState(null)
  const [facility, setFacility]     = useState(null)
  const [busy, setBusy]             = useState([]) // [{start, end}] minutes
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [penaltyWarning, setPenaltyWarning] = useState(false)
  const [blockedWarning, setBlockedWarning] = useState(false)

  // auto-filled booking details (editable before submit)
  const [bookedName, setBookedName]         = useState('')
  const [bookedContact, setBookedContact]   = useState('')
  const [editingDetails, setEditingDetails] = useState(false)

  // slot selection — multiple slots up to facility.max_slots
  const [selectedSlots, setSelectedSlots] = useState([]) // [{ start, end }]
  // event mode — the full AFM application is collected by EventRequestForm
  const [pendingEvent, setPendingEvent]   = useState(null)

  const today = new Date()
  const bookingDate = myDate(today)
  const bookingDateDisplay = today.toLocaleDateString('en-MY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kuala_Lumpur',
  })

  const minEventDateObj = new Date()
  minEventDateObj.setDate(minEventDateObj.getDate() + 14)
  const minEventDate = myDate(minEventDateObj)

  useEffect(() => {
    if (!facilityId) { navigate('/dashboard'); return }
    getUser()
    getFacility()
  }, [facilityId])

  // Prefill from a "rebook" link (same slot as a cancelled booking)
  useEffect(() => {
    if (!facility || facility.booking_mode === 'event') return
    const ps = searchParams.get('start')
    const pe = searchParams.get('end')
    if (ps && pe) setSelectedSlots([{ start: ps, end: pe }])
  }, [facility])

  // Availability polling (per-user RLS hides others' bookings, so we read the
  // busy-times view; poll + refetch on focus keeps it near-realtime).
  useEffect(() => {
    if (!facility || facility.booking_mode === 'event') return
    getBusyTimes()
    const interval = setInterval(getBusyTimes, 15000)
    window.addEventListener('focus', getBusyTimes)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', getBusyTimes)
    }
  }, [facility])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(data)
    setBookedName(data?.full_name || '')
    setBookedContact(data?.phone || '')
  }

  async function getFacility() {
    const { data, error: facError } = await supabase
      .from('facilities').select('*').eq('facility_id', facilityId).single()
    if (facError || !data) { navigate('/dashboard'); return }
    if (!data.is_available) { navigate('/dashboard'); return }
    setFacility(data)
    setLoading(false)
  }

  async function getBusyTimes() {
    const { data } = await supabase.rpc('get_busy_times', {
      p_facility_id: facilityId,
      p_date:        bookingDate,
    })
    if (data) {
      setBusy(data.map(b => ({ start: myMinutesFromTs(b.start_time), end: myMinutesFromTs(b.end_time) })))
    }
  }

  function overlaps(start, end) {
    return busy.some(r => start < r.end && end > r.start)
  }

  async function checkPenalties() {
    const { data } = await supabase
      .from('penalties').select('penalty_id')
      .eq('user_id', user.id).eq('status', 'active')
    return data ? data.length : 0
  }

  async function handleBooking() {
    setError('')
    if (selectedSlots.length === 0) { setError('Please select at least one time slot.'); return }

    setSubmitting(true)
    const penaltyCount = await checkPenalties()
    if (penaltyCount >= 3) { setBlockedWarning(true); setSubmitting(false); return }
    if (penaltyCount > 0)  { setPenaltyWarning(true); setSubmitting(false); return }
    await submitBooking()
  }

  // Event Area — full AFM application submitted from EventRequestForm
  async function handleEventApply(ef) {
    setError('')
    setSubmitting(true)
    const penaltyCount = await checkPenalties()
    if (penaltyCount >= 3) { setBlockedWarning(true); setSubmitting(false); return }
    if (penaltyCount > 0)  { setPendingEvent(ef); setPenaltyWarning(true); setSubmitting(false); return }
    await submitEvent(ef)
  }

  function continueSubmit() {
    setPenaltyWarning(false)
    if (pendingEvent) submitEvent(pendingEvent)
    else submitBooking()
  }

  async function submitEvent(ef) {
    setSubmitting(true)
    setError('')
    const { data, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id:           user.id,
        facility_id:       facility.facility_id,
        booking_date:      ef.start_datetime.split('T')[0],
        end_date:          ef.end_datetime.split('T')[0],
        start_time:        `${ef.start_datetime}:00+08:00`,
        end_time:          `${ef.end_datetime}:00+08:00`,
        booked_name:       ef.requester_name?.trim() || user.full_name,
        booked_email:      user.campus_email,
        booked_contact:    ef.requester_contact?.trim() || user.phone,
        booked_campus_id:  user.campus_id,
        status:            'pending',
        attendance_status: 'pending',
        event_details:     ef,
      })
      .select('booking_id')
      .single()

    if (bookingError) {
      setError(bookingError.code === '23P01'
        ? 'That date/time overlaps another event booking. Please adjust your dates.'
        : bookingError.message)
      setSubmitting(false)
      return
    }
    await supabase.from('notifications').insert({
      user_id:    user.id,
      booking_id: data.booking_id,
      title:      'Application Submitted',
      message:    `Your Event Area application for ${ef.event_name || formatFacilityName(facility.facility_name)} has been submitted and is pending admin review.`,
      type:       'booking',
    })
    navigate(`/bookings/${data.booking_id}`)
  }

  async function submitBooking() {
    setSubmitting(true)
    setError('')

    const status = facility.requires_approval ? 'pending' : 'confirmed'
    // one booking row per selected slot (atomic insert — all or nothing)
    const rows = selectedSlots
      .slice()
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
      .map(slot => ({
        user_id:           user.id,
        facility_id:       facility.facility_id,
        booking_date:      bookingDate,
        end_date:          null,
        start_time:        `${bookingDate}T${slot.start}:00+08:00`,
        end_time:          `${bookingDate}T${slot.end}:00+08:00`,
        booked_name:       bookedName.trim() || user.full_name,
        booked_email:      user.campus_email,
        booked_contact:    bookedContact.trim() || user.phone,
        booked_campus_id:  user.campus_id,
        status,
        attendance_status: 'pending',
      }))

    const { data, error: bookingError } = await supabase
      .from('bookings').insert(rows).select('booking_id')

    if (bookingError) {
      setError(bookingError.code === '23P01'
        ? 'One of those slots was just booked by someone else. Please pick again.'
        : bookingError.message)
      setSelectedSlots([])
      await getBusyTimes()
      setSubmitting(false)
      return
    }

    await supabase.from('notifications').insert(
      data.map(b => ({
        user_id:    user.id,
        booking_id: b.booking_id,
        title:      status === 'pending' ? 'Application Submitted' : 'Booking Confirmed',
        message:    status === 'pending'
          ? `Your booking application for ${formatFacilityName(facility.facility_name)} has been submitted and is pending admin review.`
          : `Your booking for ${formatFacilityName(facility.facility_name)} on ${bookingDate} has been confirmed.`,
        type:       'booking',
      }))
    )

    if (data.length === 1) navigate(`/bookings/${data[0].booking_id}`)
    else navigate('/bookings')
  }

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-500">Loading...</p>
        </div>
      </StudentLayout>
    )
  }

  const isEvent    = facility.booking_mode === 'event'
  const isSlot     = facility.booking_mode === 'slot'
  const openMin    = toMinutes(facility.opening_time.slice(0, 5))
  const closeMin   = toMinutes(facility.closing_time.slice(0, 5))
  const nowMin     = nowMyMinutes()

  // slot options (library): back-to-back blocks of max_booking_hours (e.g. 8–10, 10–12)
  const slotOptions = []
  if (isSlot) {
    const dur = (facility.slot_hours || 1) * 60
    for (let s = openMin; s + dur <= closeMin; s += dur) {
      const e = s + dur
      slotOptions.push({
        start: toHHMM(s), end: toHHMM(e),
        label: `${label12(toHHMM(s))} – ${label12(toHHMM(e))}`,
        // bookable until the slot's END time passes (e.g. 10–12 still open at 11)
        disabled: e <= nowMin || overlaps(s, e),
      })
    }
  }

  const maxSlots = facility.max_slots || 1
  function toggleSlot(slot) {
    setError('')
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.start === slot.start)
      if (exists) return prev.filter(s => s.start !== slot.start)
      if (prev.length >= maxSlots) return prev // at limit
      return [...prev, slot]
    })
  }

  // Rules & instructions
  const rules = isEvent
    ? [
        'Event Area bookings must be made at least 7 days in advance.',
        'This booking requires admin approval and stays pending until reviewed.',
        facility.requires_payment ? 'Payment is made at the AFM counter.' : null,
      ].filter(Boolean)
    : [
        'Arrive on time. If you are not marked present within 15 minutes of your start time, your booking is automatically released.',
        'Each no-show adds 1 penalty — 3 active penalties block your booking access.',
        facility.requires_approval ? 'This facility requires admin approval; your booking stays pending until an admin reviews it.' : null,
        facility.requires_payment ? `Payment: RM ${Number(facility.price_per_booking).toFixed(2)} — pay at the AFM counter on arrival.` : null,
      ].filter(Boolean)

  const extraInstructions = (facility.booking_instructions || '')
    .split('\n').map(s => s.trim()).filter(Boolean)

  const contact = getDepartmentContact(facility.department)

  return (
    <StudentLayout user={user}>
      <div className="max-w-7xl mx-auto px-6 py-8 w-full">

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 mb-6"
        >
          ← Back to Home
        </button>

        <div className={isEvent ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-8'}>

          {/* Left — facility details + rules */}
          <div className="space-y-6">
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
                </div>
                <p className="text-sm text-gray-500 mb-4">{facility.location}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Capacity</p>
                    <p className="font-medium text-gray-900">
                      {facility.min_capacity}–{facility.max_capacity >= 999 ? '∞' : facility.max_capacity} pax
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Opening Hours</p>
                    <p className="font-medium text-gray-900">
                      {facility.opening_time?.slice(0, 5)} – {facility.closing_time?.slice(0, 5)}
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
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Booking</p>
                    <p className="font-medium text-gray-900">
                      {isEvent ? 'By date range' : `${facility.slot_hours}h slot${facility.max_slots > 1 ? ` × up to ${facility.max_slots}` : ''}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rules & Regulations (event has its own rules inside the form) */}
            {!isEvent && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-3">Rules & Regulations</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                {rules.map((r, i) => <li key={i}>{r}</li>)}
              </ol>

              {extraInstructions.length > 0 && (
                <>
                  <h4 className="font-semibold text-gray-900 mt-5 mb-2 text-sm">What to do after booking</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    {extraInstructions.map((r, i) => <li key={i}>{r}</li>)}
                  </ol>
                </>
              )}
            </div>
            )}

            {/* Inquiries & contact */}
            {contact && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-1">Inquiries & Concerns</h3>
                <p className="text-sm text-gray-500 mb-3">
                  For any inquiries or concerns regarding this booking, please contact the {contact.department} department.
                </p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="text-gray-400">Person in charge:</span> {contact.pic}</p>
                  <p><span className="text-gray-400">Tel:</span> {contact.tel}</p>
                  <p><span className="text-gray-400">Email:</span> {contact.email}</p>
                  <p><span className="text-gray-400">Department:</span> {contact.department} ({contact.level})</p>
                </div>
              </div>
            )}
          </div>

          {/* Right — booking form (event uses the full AFM application form) */}
          {isEvent ? (
            <EventRequestForm
              user={user}
              minEventDate={minEventDate}
              submitting={submitting}
              error={error}
              onSubmit={handleEventApply}
            />
          ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Booking Summary</h3>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Your Details (auto-filled)</p>
                <button
                  type="button"
                  onClick={() => setEditingDetails(v => !v)}
                  className="text-xs text-red-600 hover:underline font-medium"
                >
                  {editingDetails ? 'Done' : '✏️ Edit'}
                </button>
              </div>

              <div className="space-y-4">
                <Detail label="Campus ID" value={user?.campus_id} />

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Name</label>
                  {editingDetails ? (
                    <input
                      value={bookedName}
                      onChange={e => setBookedName(e.target.value)}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{bookedName || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">Contact</label>
                  {editingDetails ? (
                    <input
                      value={bookedContact}
                      onChange={e => setBookedContact(e.target.value)}
                      placeholder="01XXXXXXXX"
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{bookedContact || '—'}</p>
                  )}
                </div>

                <Detail label="Booking Date" value={bookingDateDisplay} />
              </div>
            </div>

            {/* Slot picker — select up to max_slots */}
            {isSlot && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Select Time Slot{maxSlots > 1 ? 's' : ''}
                  </label>
                  <span className="text-xs text-gray-400">{selectedSlots.length}/{maxSlots} selected</span>
                </div>
                {slotOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No time slots available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {slotOptions.map(slot => {
                      const selected = selectedSlots.some(s => s.start === slot.start)
                      const atLimit  = !selected && selectedSlots.length >= maxSlots
                      return (
                        <button
                          key={slot.start}
                          onClick={() => !slot.disabled && toggleSlot({ start: slot.start, end: slot.end })}
                          disabled={slot.disabled || atLimit}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                            slot.disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                            : selected ? 'bg-red-600 text-white'
                            : atLimit ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-200'
                            : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                          }`}
                        >
                          {slot.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {maxSlots > 1 && (
                  <p className="text-xs text-gray-400 mt-2">
                    You can book up to {maxSlots} slots ({maxSlots * (facility.slot_hours || 1)} hours total).
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            <button
              onClick={handleBooking}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : facility.requires_approval ? 'Submit Application' : 'Book Now'}
            </button>
          </div>
          )}
        </div>
      </div>

      {penaltyWarning && (
        <Popup icon="⚠️" title="Penalty Warning"
          body="You have active penalties on your account. Please note that 3 penalties will result in a booking restriction."
          onCancel={() => { setPenaltyWarning(false); setPendingEvent(null) }}
          onConfirm={continueSubmit} />
      )}
      {blockedWarning && (
        <Popup icon="🚫" title="Booking Blocked"
          body="You have 3 or more active penalties. Your account is restricted from making new bookings. Please contact admin to resolve your penalties."
          onCancel={() => setBlockedWarning(false)} />
      )}
    </StudentLayout>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function Popup({ icon, title, body, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            {onConfirm ? 'Cancel' : 'OK'}
          </button>
          {onConfirm && (
            <button onClick={onConfirm}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

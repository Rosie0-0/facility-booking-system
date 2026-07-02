import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName, getFacilityImageUrl } from '../../lib/facilityImages'
import StudentLayout from '../../components/StudentLayout'

function formatTime(datetime) {
  if (!datetime) return '—'
  return new Date(datetime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
function tsToMyTime(ts) {
  if (!ts) return ''
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ts))
  return `${p.find(x => x.type === 'hour').value}:${p.find(x => x.type === 'minute').value}`
}

const statusColors = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  released:  'bg-orange-100 text-orange-700',
}

export default function BookingDetail() {
  const navigate = useNavigate()
  const { bookingId } = useParams()

  const [user, setUser]       = useState(null)
  const [booking, setBooking] = useState(null)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) getBooking() }, [user])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(data)
  }

  async function getBooking() {
    const { data, error } = await supabase
      .from('bookings').select('*').eq('booking_id', bookingId).eq('user_id', user.id).single()
    if (error || !data) { navigate('/bookings'); return }
    setBooking(data)

    const { data: facilityData } = await supabase
      .from('facilities').select('*').eq('facility_id', data.facility_id).single()
    setFacility(facilityData)
    setLoading(false)
  }

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="flex items-center justify-center py-32"><p className="text-gray-500">Loading...</p></div>
      </StudentLayout>
    )
  }

  const isEvent = facility?.booking_mode === 'event'
  const status  = booking?.status

  const banner = {
    confirmed: { bg: 'bg-green-50 border-green-200', icon: '✅', title: 'Booking Confirmed!',
                 text: "Your booking is confirmed. Please arrive on time — you must be marked present within 15 minutes or the booking is automatically released." },
    pending:   { bg: 'bg-yellow-50 border-yellow-200', icon: '⏳', title: 'Application Submitted',
                 text: 'This facility requires admin approval. Your application is pending review — you will be notified of the decision.' },
    rejected:  { bg: 'bg-red-50 border-red-200', icon: '❌', title: 'Booking Rejected',
                 text: 'Your booking application was rejected. See the admin comment below.' },
    released:  { bg: 'bg-orange-50 border-orange-200', icon: '⚠️', title: 'Booking Auto-Released',
                 text: 'This booking was automatically released because you were not marked present in time. A no-show penalty was issued.' },
    cancelled: { bg: 'bg-gray-50 border-gray-200', icon: '🚫', title: 'Booking Cancelled',
                 text: 'This booking has been cancelled.' },
  }[status]

  const rules = isEvent
    ? [
        'Event Area bookings require admin approval and remain pending until reviewed.',
        facility?.requires_payment ? 'Payment is made at the AFM counter.' : null,
      ].filter(Boolean)
    : [
        'Arrive on time. If you are not marked present within 15 minutes of your start time, your booking is automatically released.',
        'Each no-show adds 1 penalty — 3 active penalties block your booking access.',
        facility?.requires_payment ? `Payment: RM ${Number(facility?.price_per_booking).toFixed(2)} — pay at the AFM counter on arrival.` : null,
      ].filter(Boolean)

  const extraInstructions = (facility?.booking_instructions || '')
    .split('\n').map(s => s.trim()).filter(Boolean)

  return (
    <StudentLayout user={user}>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 mb-6"
        >
          ← Back
        </button>

        {/* Status banner */}
        {banner && (
          <div className={`border rounded-xl p-4 mb-6 flex items-start gap-3 ${banner.bg}`}>
            <span className="text-2xl">{banner.icon}</span>
            <div>
              <p className="font-semibold text-gray-800">{banner.title}</p>
              <p className="text-sm text-gray-600 mt-1">{banner.text}</p>
            </div>
          </div>
        )}

        {/* Admin comment */}
        {booking?.admin_comment && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Admin comment</p>
            <p className="text-sm text-gray-800">{booking.admin_comment}</p>
          </div>
        )}

        {/* Booking card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <img
            src={getFacilityImageUrl(facility?.image_path, facility?.facility_name)}
            alt={formatFacilityName(facility?.facility_name)}
            className="w-full h-48 object-cover"
            onError={e => e.target.src = '/facilities/discussion_room.jpg'}
          />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{formatFacilityName(facility?.facility_name)}</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusColors[status]}`}>{status}</span>
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-gray-400">Booking Reference</p>
              <p className="text-sm font-mono font-medium text-gray-700 mt-1">
                {booking?.booking_id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-4">
              <DetailRow label="Campus ID" value={user?.campus_id} />
              <DetailRow label="Name" value={booking?.booked_name} />
              <DetailRow label="Contact" value={booking?.booked_contact || '—'} />
              {isEvent ? (
                <>
                  <DetailRow label="Event Start Date" value={formatDate(booking?.booking_date)} />
                  <DetailRow label="Event End Date" value={formatDate(booking?.end_date)} />
                </>
              ) : (
                <>
                  <DetailRow label="Booking Date" value={formatDate(booking?.booking_date)} />
                  <DetailRow label="Time" value={`${formatTime(booking?.start_time)} – ${formatTime(booking?.end_time)}`} />
                </>
              )}
              <DetailRow label="Location" value={facility?.location} />
              <DetailRow label="Fee" value={facility?.requires_payment ? `RM ${Number(facility?.price_per_booking).toFixed(2)}` : 'Free'} />
            </div>
          </div>
        </div>

        {/* Rules & instructions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
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

        {/* Rebook — for cancelled/rejected/released bookings */}
        {['cancelled', 'rejected', 'released'].includes(status) && (
          <button
            onClick={() => {
              if (isEvent) { navigate(`/bookings/new?facility=${facility.facility_id}`); return }
              navigate(`/bookings/new?facility=${facility.facility_id}&start=${tsToMyTime(booking.start_time)}&end=${tsToMyTime(booking.end_time)}`)
            }}
            className="w-full mt-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Rebook this facility
          </button>
        )}

      </div>
    </StudentLayout>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between py-3 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

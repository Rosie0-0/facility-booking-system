import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName, getFacilityImageUrl } from '../../lib/facilityImages'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

function formatDateTime(datetime) {
  if (!datetime) return '—'
  return new Date(datetime).toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function BookingDetail() {
  const navigate = useNavigate()
  const { bookingId } = useParams()

  const [user, setUser]       = useState(null)
  const [booking, setBooking] = useState(null)
  const [facility, setFacility] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) getBooking()
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

  async function getBooking() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) { navigate('/bookings'); return }
    setBooking(data)

    // Get facility details
    const { data: facilityData } = await supabase
      .from('facilities')
      .select('*')
      .eq('facility_id', data.facility_id)
      .single()

    setFacility(facilityData)
    setLoading(false)
  }

  const statusColors = {
    pending:   'bg-yellow-100 text-yellow-700',
    approved:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
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

  const isEventArea = facility?.facility_name === 'event_area'
  const isNewBooking = booking?.status === 'pending'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-3xl mx-auto px-6 py-8 flex-1 w-full">

        {/* Success message — only for new pending bookings */}
        {isNewBooking && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Booking Submitted Successfully!</p>
              <p className="text-sm text-green-700 mt-1">
                Your booking is pending admin approval. You will be notified once it is reviewed.
              </p>
            </div>
          </div>
        )}

        {/* Event Area Google Form notice */}
        {isEventArea && isNewBooking && facility?.google_form_url && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <p className="font-semibold text-blue-800">Complete Your Event Details</p>
              <p className="text-sm text-blue-700 mt-1 mb-3">
                Please complete the AFM Logistic Requisition Form to finalize your Event Area booking. 
                The form will open in a new tab. <b> Please make sure the form are submitted 2 weeks before the event/activities date. </b>
              </p>
              <a
                href={facility.google_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                Open Logistic Requisition Form
              </a>
            </div>
          </div>
        )}

        {/* Booking detail card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Facility image */}
          <img
            src={getFacilityImageUrl(facility?.image_path, facility?.facility_name)}
            alt={formatFacilityName(facility?.facility_name)}
            className="w-full h-48 object-cover"
            onError={e => e.target.src = '/facilities/discussion_room.jpg'}
          />

          <div className="p-6">

            {/* Facility name + status */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {formatFacilityName(facility?.facility_name)}
              </h2>
              <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusColors[booking?.status]}`}>
                {booking?.status}
              </span>
            </div>

            {/* Booking reference */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-gray-400">Booking Reference</p>
              <p className="text-sm font-mono font-medium text-gray-700 mt-1">
                {booking?.booking_id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            {/* Details grid */}
            <div className="space-y-4">

              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Student ID</span>
                <span className="text-sm font-medium text-gray-900">{user?.campus_id}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium text-gray-900">{booking?.booked_name}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Contact</span>
                <span className="text-sm font-medium text-gray-900">{booking?.booked_contact || '—'}</span>
              </div>

              {isEventArea ? (
                <>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Event Start Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(booking?.booking_date)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Event End Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(booking?.end_date)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Booking Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(booking?.booking_date)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Time</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateTime(booking?.start_time)} – {formatDateTime(booking?.end_time)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Location</span>
                <span className="text-sm font-medium text-gray-900">{facility?.location}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Fee</span>
                <span className="text-sm font-medium text-gray-900">
                  {facility?.requires_payment
                    ? `RM ${Number(facility?.price_per_booking).toFixed(2)}`
                    : 'Free'}
                </span>
              </div>

              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Booking Status</span>
                <span className={`text-sm font-medium capitalize px-2 py-0.5 rounded-full ${statusColors[booking?.status]}`}>
                  {booking?.status}
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/facilities')}
            className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Back to Facilities
          </button>
          <button
            onClick={() => navigate('/bookings')}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
          >
            View My Bookings
          </button>
        </div>

      </div>

      <Footer />
    </div>
  )
}
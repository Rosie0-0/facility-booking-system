import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFacilityName } from '../lib/facilityImages'

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

export default function BookingDetailPopup({ booking, adminUser, onClose, onUpdate, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false)
  console.log('Booking object:', booking)
  console.log('Booking payment:', booking.payments)

async function handleApprove() {
    console.log('Booking ID:', booking.booking_id)
    setActionLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'approved' })
      .eq('booking_id', booking.booking_id)
      .select()

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Booking Approved',
        message: `Your booking for ${formatFacilityName(booking.facilities?.facility_name)} on ${formatDate(booking.booking_date)} has been approved.`,
        type:    'booking'
      })
      onUpdate(booking.booking_id, { status: 'approved' })

      if (onRefresh) {
        await onRefresh()
      }

      onClose()
    }
    setActionLoading(false)
  }

 async function handleReject() {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('booking_id', booking.booking_id)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Booking Rejected',
        message: `Your booking for ${formatFacilityName(booking.facilities?.facility_name)} on ${formatDate(booking.booking_date)} has been rejected.`,
        type:    'booking'
      })
      onUpdate(booking.booking_id, { status: 'rejected' })

      if (onRefresh) {
        await onRefresh()
      }

      onClose()
    }
    setActionLoading(false)
  }

  async function handleAttendance(status) {
    console.log('Attendance status being sent:', status)
    setActionLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .update({
        attendance_status: status,
        checked_by: adminUser.id
      })
      .eq('booking_id', booking.booking_id)
      .select()

    console.log('Attendance data:', data)
    console.log('Attendance error:', error)

    if (!error) {
      if (status === 'no_show') {
        await supabase.from('penalties').insert({
          user_id:    booking.user_id,
          booking_id: booking.booking_id,
          reason:     'no_show',
          status:     'active',
        })
        await supabase.from('notifications').insert({
          user_id: booking.user_id,
          title:   'Penalty Issued',
          message: `A no_show penalty has been issued for missing your booking on ${formatDate(booking.booking_date)}.`,
          type:    'penalty'
        })
      }
      onUpdate(booking.booking_id, { attendance_status: status })

      if (onRefresh) {
        await onRefresh()
      }
        onClose()
      }

    setActionLoading(false)
  }

  async function handleMarkPaid() {
    setActionLoading(true)
    const { error } = await supabase
      .from('payments')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('booking_id', booking.booking_id)

    if (!error) {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        title:   'Payment Confirmed',
        message: `Your payment for ${formatFacilityName(booking.facilities?.facility_name)} has been confirmed.`,
        type:    'payment'
      })
      onUpdate(booking.booking_id, { payment_status: 'paid' })

      if (onRefresh) {
        await onRefresh()
      }

      onClose()
    }
    setActionLoading(false)
  }

    {/* Booking detail popup */}
    return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Manage Booking</h3>
                    <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                    </div>

                    <div className="p-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Student</span>
                        <span className="font-medium">{booking.booked_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Campus ID</span>
                        <span className="font-medium">{booking.booked_campus_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Contact</span>
                        <span className="font-medium">{booking.booked_contact || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Facility</span>
                        <span className="font-medium">{formatFacilityName(booking.facilities?.facility_name)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium">{formatDate(booking.booking_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Time</span>
                        <span className="font-medium">
                        {booking.facilities?.facility_name === 'event_area'
                            ? 'Full day'
                            : `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
                        }
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[booking.status]}`}>
                        {booking.status}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Fee</span>
                        <span className="font-medium">
                        {booking.facilities?.requires_payment ? (
                          <>
                            RM {Number(booking.facilities?.price_per_booking).toFixed(2)}

                            {booking.payments?.payment_status === 'paid' && (
                              <span className="ml-2 text-green-600 font-semibold">
                                (Paid)
                              </span>
                            )}
                          </>
                        ) : ('Free')}
                        </span>
                    </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-gray-100 space-y-3">

                    {/* Approve / Reject — only for pending */}
                    {booking.status === 'pending' && (
                        <div className="flex gap-3">
                        <button
                            onClick={() => handleApprove(booking.booking_id)}
                            disabled={actionLoading}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                            ✅ Approve
                        </button>
                        <button
                            onClick={() => handleReject(booking.booking_id)}
                            disabled={actionLoading}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                            ❌ Reject
                        </button>
                        </div>
                    )}

                    {/* Attendance — only for approved bookings */}
                    {booking.status === 'approved' && (
                        <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium">Update Attendance:</p>
                        <div className="flex gap-3">
                            <button
                              onClick={() => handleAttendance('present')}
                              disabled={actionLoading || booking.attendance_status !== 'pending'}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                                    booking.attendance_status !== 'pending'
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}                            
                            >
                            Present
                            </button>
                            <button
                            onClick={() => handleAttendance('no_show')}
                            disabled={actionLoading || booking.attendance_status !== 'pending'}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                                  booking.attendance_status !== 'pending'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                }`}                            
                            >
                            No Show
                            </button>
                        </div>
                        </div>
                    )}

                    {/* Mark paid — only for approved + requires payment */}
                    { booking.status === 'approved' && 
                      booking.facilities?.requires_payment && 
                      booking.payments?.payment_status !== 'paid' && (
                        <button
                        onClick={() => handleMarkPaid(booking.booking_id)}
                        disabled={actionLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                        Mark as Paid
                        </button>
                    )}
                    </div>
                    </div>
                </div>
    )
}



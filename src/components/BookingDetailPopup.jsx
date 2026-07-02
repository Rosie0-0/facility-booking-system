import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatFacilityName } from '../lib/facilityImages'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(datetime) {
  if (!datetime) return '—'
  return new Date(datetime).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function tsToMyDate(ts) {
  if (!ts) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(ts))
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

export default function BookingDetailPopup({ booking, adminUser, onClose, onUpdate, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(booking.booked_name || '')
  const [editContact, setEditContact] = useState(booking.booked_contact || '')
  const [editDate, setEditDate] = useState(tsToMyDate(booking.start_time))
  const [editStart, setEditStart] = useState(tsToMyTime(booking.start_time))
  const [editEnd, setEditEnd] = useState(tsToMyTime(booking.end_time))
  const [editError, setEditError] = useState('')

  const facility       = booking.facilities || {}
  const isEvent        = facility.booking_mode === 'event'
  const needsApproval  = facility.requires_approval

  async function refresh() {
    if (onRefresh) await onRefresh()
  }

  async function handleDecision(decision) {
    // decision: 'confirmed' (approve) or 'rejected'
    if (decision === 'rejected' && !comment.trim()) {
      return
    }
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: decision, admin_comment: comment.trim() || null })
      .eq('booking_id', booking.booking_id)

    if (!error) {
      const approved = decision === 'confirmed'
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        booking_id: booking.booking_id,
        title:   approved ? 'Booking Approved' : 'Booking Rejected',
        message: `Your booking for ${formatFacilityName(facility.facility_name)} on ${formatDate(booking.booking_date)} has been ${approved ? 'approved' : 'rejected'}.`
          + (comment.trim() ? ` Admin comment: ${comment.trim()}` : ''),
        type:    'booking',
      })
      onUpdate(booking.booking_id, { status: decision, admin_comment: comment.trim() || null })
      await refresh()
      onClose()
    }
    setActionLoading(false)
  }

  async function handlePresent() {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ attendance_status: 'present', checked_by: adminUser.id })
      .eq('booking_id', booking.booking_id)

    if (!error) {
      onUpdate(booking.booking_id, { attendance_status: 'present' })
      await refresh()
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
        booking_id: booking.booking_id,
        title:   'Payment Confirmed',
        message: `Your payment for ${formatFacilityName(facility.facility_name)} has been confirmed.`,
        type:    'payment',
      })
      onUpdate(booking.booking_id, { payment_status: 'paid' })
      await refresh()
      onClose()
    }
    setActionLoading(false)
  }

  async function handleSaveDetails() {
    setEditError('')
    const updates = { booked_name: editName.trim(), booked_contact: editContact.trim() }
    if (!isEvent) {
      if (editEnd <= editStart) { setEditError('End time must be after start time.'); return }
      updates.booking_date = editDate
      updates.start_time   = `${editDate}T${editStart}:00+08:00`
      updates.end_time     = `${editDate}T${editEnd}:00+08:00`
    }
    setActionLoading(true)
    const { error } = await supabase.from('bookings').update(updates).eq('booking_id', booking.booking_id)
    if (error) {
      setEditError(error.code === '23P01'
        ? 'That time overlaps another booking for this facility.'
        : error.message)
      setActionLoading(false)
      return
    }
    await supabase.from('notifications').insert({
      user_id: booking.user_id,
      booking_id: booking.booking_id,
      title:   'Booking Updated',
      message: `Your booking for ${formatFacilityName(facility.facility_name)} was updated by the admin.`,
      type:    'booking',
    })
    onUpdate(booking.booking_id, updates)
    setEditing(false)
    await refresh()
    setActionLoading(false)
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this booking? This frees the time slot.')) return
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings').update({ status: 'cancelled' }).eq('booking_id', booking.booking_id)
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        booking_id: booking.booking_id,
        title:   'Booking Cancelled',
        message: `Your booking for ${formatFacilityName(facility.facility_name)} on ${formatDate(booking.booking_date)} was cancelled by the admin.`,
        type:    'booking',
      })
      onUpdate(booking.booking_id, { status: 'cancelled' })
      await refresh()
      onClose()
    }
    setActionLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${booking.event_details ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Manage Booking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Details</span>
            {editing ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditing(false); setEditError('')
                    setEditName(booking.booked_name || ''); setEditContact(booking.booked_contact || '')
                    setEditDate(tsToMyDate(booking.start_time)); setEditStart(tsToMyTime(booking.start_time)); setEditEnd(tsToMyTime(booking.end_time))
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancel
                </button>
                <button onClick={handleSaveDetails} disabled={actionLoading} className="text-xs text-red-600 hover:underline font-medium">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs text-red-600 hover:underline font-medium">
                ✏️ Edit
              </button>
            )}
          </div>

          {editing ? (
            <EditRow label="User" value={editName} onChange={setEditName} />
          ) : (
            <Row label="User" value={booking.booked_name} />
          )}
          <Row label="Campus ID" value={booking.booked_campus_id} />
          {editing ? (
            <EditRow label="Contact" value={editContact} onChange={setEditContact} />
          ) : (
            <Row label="Contact" value={booking.booked_contact || '—'} />
          )}
          <Row label="Facility" value={formatFacilityName(facility.facility_name)} />

          {editing && !isEvent ? (
            <>
              <EditRow label="Date"  type="date" value={editDate}  onChange={setEditDate} />
              <EditRow label="Start" type="time" value={editStart} onChange={setEditStart} />
              <EditRow label="End"   type="time" value={editEnd}   onChange={setEditEnd} />
            </>
          ) : (
            <>
              <Row label="Date" value={isEvent
                ? `${formatDate(booking.booking_date)} – ${formatDate(booking.end_date)}`
                : formatDate(booking.booking_date)} />
              <Row label="Time" value={isEvent ? 'Full day' : `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`} />
            </>
          )}

          {editError && <p className="text-red-600 text-xs">{editError}</p>}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[booking.status]}`}>
              {booking.status}
            </span>
          </div>
          {!isEvent && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Attendance</span>
              <span className="font-medium capitalize">{booking.attendance_status}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Fee</span>
            <span className="font-medium">
              {facility.requires_payment ? (
                <>
                  RM {Number(facility.price_per_booking).toFixed(2)}
                  {booking.payments?.payment_status === 'paid' && (
                    <span className="ml-2 text-green-600 font-semibold">(Paid)</span>
                  )}
                </>
              ) : 'Free'}
            </span>
          </div>
          {booking.admin_comment && (
            <div className="text-sm bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Admin comment</p>
              <p className="text-gray-800">{booking.admin_comment}</p>
            </div>
          )}

          {booking.event_details && <EventApplication d={booking.event_details} />}
        </div>

        <div className="p-6 border-t border-gray-100 space-y-3">

          {/* Approve / Reject — approval facilities awaiting review */}
          {needsApproval && booking.status === 'pending' && (
            <div className="space-y-3">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Comment to the user (required to reject, e.g. reason)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleDecision('confirmed')}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={actionLoading || !comment.trim()}
                  title={!comment.trim() ? 'Add a comment to reject' : ''}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          )}

          {/* Attendance — confirmed, non-event bookings */}
          {booking.status === 'confirmed' && !isEvent && (
            <button
              onClick={handlePresent}
              disabled={actionLoading || booking.attendance_status === 'present'}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                booking.attendance_status === 'present'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {booking.attendance_status === 'present' ? 'Marked Present' : 'Mark Present'}
            </button>
          )}

          {/* Mark paid — confirmed + requires payment + unpaid */}
          {booking.status === 'confirmed' && facility.requires_payment && booking.payments?.payment_status !== 'paid' && (
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}

          {/* Cancel — pending or confirmed bookings */}
          {['pending', 'confirmed'].includes(booking.status) && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="w-full border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function EditRow({ label, value, onChange, type = 'text' }) {
  return (
    <div className="flex justify-between items-center text-sm gap-3">
      <span className="text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right w-44 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>
  )
}

function EvRow({ k, v }) {
  if (v === undefined || v === null || v === '') return null
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{k}</span>
      <span className="text-gray-800 text-right">{String(v)}</span>
    </div>
  )
}

// Full AFM application, for admin review
function EventApplication({ d }) {
  const equip = Object.entries(d.equipment || {})
  const dt = s => (s ? s.replace('T', ' ') : '')
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="font-semibold text-gray-900 mb-2 text-sm">📋 Event Application (AFM form)</p>
      <div className="space-y-1 text-xs">
        <EvRow k="Event name" v={d.event_name} />
        <EvRow k="Event date" v={d.event_date} />
        <EvRow k="Department" v={d.department} />
        <EvRow k="Subject code" v={d.subject_code} />
        <EvRow k="Venue" v={d.venue_full || d.venue} />
        <EvRow k="Start" v={dt(d.start_datetime)} />
        <EvRow k="End" v={dt(d.end_datetime)} />
        <EvRow k="Setup" v={dt(d.setup_datetime)} />
        <EvRow k="Clearing" v={dt(d.clearing_datetime)} />
        <EvRow k="Participants" v={d.participants} />
        <EvRow k="Floor plan" v={d.floor_plan ? 'Yes' : 'No'} />
        <EvRow k="External party" v={d.external_party} />
        <EvRow k="Requester" v={d.requester_name} />
        <EvRow k="Requester contact" v={d.requester_contact} />
        <EvRow k="Requester email" v={d.requester_email} />
        <EvRow k="PIC" v={d.pic_name} />
        <EvRow k="PIC contact" v={d.pic_contact} />
        <EvRow k="PIC department" v={d.pic_department} />
        <EvRow k="Own appliances" v={d.own_appliances} />
        <EvRow k="Other equipment" v={d.other_equipment} />
        <EvRow k="Remarks" v={d.remarks} />
      </div>

      {equip.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-gray-500 text-xs mb-1">Equipment requested</p>
          <div className="space-y-0.5">
            {equip.map(([item, qty]) => (
              <div key={item} className="flex justify-between text-xs text-gray-700">
                <span>{item}</span><span>x{qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(d.van_name || d.carpark_name) && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-700 space-y-0.5">
          {d.van_name && <p>Van: {d.van_name} → {d.van_dest} ({d.van_pax} pax)</p>}
          {d.carpark_name && <p>Car park: {d.carpark_name} — {d.carpark_plate}</p>}
        </div>
      )}
    </div>
  )
}

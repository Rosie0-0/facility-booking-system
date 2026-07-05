import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StudentLayout from '../../components/StudentLayout'
import {
  formatFacilityName,
  getFacilityImageUrl,
  getFacilityPlaceholder,
} from '../../lib/facilityImages'

const campusImg = '/Inti-campus.jpg'

function formatTime(t) {
  return t ? t.slice(0, 5) : '—'
}

function isDiscussionRoom(f) {
  return f.facility_name?.startsWith('discussion_room')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(null)       // facility for the info popup
  const [showRooms, setShowRooms] = useState(false) // library rooms modal

  useEffect(() => { getUser() }, [])
  useEffect(() => { getFacilities() }, [])

  // Live refresh: admin availability toggles / facility edits show without reload
  useEffect(() => {
    const channel = supabase
      .channel('home-facilities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, getFacilities)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(data)
  }

  async function getFacilities() {
    const { data } = await supabase
      .from('facilities')
      .select('*, equipment(equipment_id, equipment_name, quantity, equipment_price)')
      .order('facility_name')
    setFacilities(data || [])
    setLoading(false)
  }

  const discussionRooms = facilities.filter(isDiscussionRoom)
  const otherFacilities = facilities.filter(f => !isDiscussionRoom(f))

  return (
    <StudentLayout user={user}>
      {/* Welcome banner */}
      <div className="relative h-56 overflow-hidden">
        <img src={campusImg} alt="INTI Campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-center px-8 md:px-12">
          <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
            Welcome to INTI Facility<br />Booking Portal
          </h1>
          <p className="text-gray-200 mt-2 text-sm">Reserve campus facilities easily and efficiently.</p>
        </div>
      </div>

      {/* Make Your Booking */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full">
        <h2 className="text-2xl font-bold text-gray-900">Make Your Booking</h2>
        <p className="text-sm text-gray-500 mb-6">Select the facility to make a booking</p>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading facilities...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Grouped library discussion rooms */}
            {discussionRooms.length > 0 && (
              <div
                onClick={() => setShowRooms(true)}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md cursor-pointer transition"
              >
                <div className="h-44 bg-gray-100 overflow-hidden relative">
                  <img src="/facilities/discussion_room.jpg" alt="Library Discussion Room" className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {discussionRooms.length} rooms
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="font-semibold text-gray-900 text-sm">Library Discussion Room</p>
                  <p className="text-xs text-gray-400">Level 6, Library</p>
                </div>
              </div>
            )}

            {otherFacilities.map(f => (
              <FacilityCard key={f.facility_id} facility={f} onInfo={() => setInfo(f)} />
            ))}
          </div>
        )}
      </div>

      {/* Library rooms modal */}
      {showRooms && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">Library Discussion Rooms</h3>
              <button onClick={() => setShowRooms(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {discussionRooms.map(room => (
                <FacilityCard key={room.facility_id} facility={room} onInfo={() => setInfo(room)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {info && (
        <InfoPopup
          facility={info}
          onClose={() => setInfo(null)}
          onBook={() => navigate(`/bookings/new?facility=${info.facility_id}`)}
        />
      )}
    </StudentLayout>
  )
}

function FacilityCard({ facility, onInfo }) {
  const navigate = useNavigate()
  const [src, setSrc] = useState(getFacilityImageUrl(facility.image_path, facility.facility_name))
  const available = facility.is_available
  const book = () => available && navigate(`/bookings/new?facility=${facility.facility_id}`)

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 transition ${
      available ? 'hover:shadow-md' : 'opacity-70'
    }`}>
      <div onClick={book} className={`h-44 bg-gray-100 overflow-hidden relative ${available ? 'cursor-pointer' : ''}`}>
        <img
          src={src} alt={formatFacilityName(facility.facility_name)}
          className="w-full h-full object-cover"
          onError={() => setSrc(getFacilityPlaceholder())}
        />
        {!available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Unavailable</span>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div onClick={book} className={available ? 'cursor-pointer' : ''}>
          <p className="font-semibold text-gray-900 text-sm">{formatFacilityName(facility.facility_name)}</p>
          <p className="text-xs text-gray-400">{facility.location}</p>
        </div>
        <button
          onClick={onInfo}
          title="Facility details"
          className="w-7 h-7 shrink-0 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-xs font-bold"
        >
          i
        </button>
      </div>
    </div>
  )
}

function InfoPopup({ facility, onClose, onBook }) {
  const available = facility.is_available
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <img
          src={getFacilityImageUrl(facility.image_path, facility.facility_name)}
          alt={formatFacilityName(facility.facility_name)}
          className="w-full h-44 object-cover"
          onError={e => e.target.src = getFacilityPlaceholder()}
        />
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-900">{formatFacilityName(facility.facility_name)}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{facility.location}</p>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
            <p><span className="text-gray-400">Capacity:</span> {facility.min_capacity}–{facility.max_capacity >= 999 ? '∞' : facility.max_capacity} pax</p>
            <p><span className="text-gray-400">Hours:</span> {formatTime(facility.opening_time)} – {formatTime(facility.closing_time)}</p>
            <p><span className="text-gray-400">Booking:</span> {facility.booking_mode === 'event' ? 'Date range' : `${facility.slot_hours}h slot${facility.max_slots > 1 ? ` × up to ${facility.max_slots}` : ''}`}</p>
            <p><span className="text-gray-400">Fee:</span> {facility.requires_payment ? `RM ${Number(facility.price_per_booking).toFixed(2)}` : 'Free'}</p>
          </div>

          {facility.requires_approval && (
            <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mb-4">
              This facility requires admin approval before your booking is confirmed.
            </p>
          )}

          {facility.equipment?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Equipment provided</p>
              <div className="space-y-1">
                {facility.equipment.map(eq => (
                  <div key={eq.equipment_id} className="flex justify-between text-xs text-gray-600">
                    <span>{eq.equipment_name} (x{eq.quantity})</span>
                    <span>{eq.equipment_price > 0 ? `RM ${Number(eq.equipment_price).toFixed(2)}` : 'Free'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onBook}
            disabled={!available}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
              available ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {available ? 'Book Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  )
}

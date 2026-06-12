import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import {
  formatFacilityName,
  getFacilityImageUrl,
  getFacilityPlaceholder,
} from '../../lib/facilityImages'

function formatTime(time) {
  if (!time) return '—'
  return time.slice(0, 5)
}

function formatCapacity(capacity) {
  return capacity >= 999 ? 'No limit' : capacity
}

function FacilityCard({ facility }) {
  const navigate = useNavigate()
  const [imageSrc, setImageSrc] = useState(
    getFacilityImageUrl(facility.image_path, facility.facility_name)
  )

  function handleImageError() {
    setImageSrc(getFacilityPlaceholder())
  }

  const statusColors = {
    available: 'bg-green-100 text-green-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition">
      <div className="h-48 bg-gray-100 overflow-hidden">
        <img
          src={imageSrc}
          alt={formatFacilityName(facility.facility_name)}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-gray-900">
            {formatFacilityName(facility.facility_name)}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full capitalize shrink-0 ${statusColors[facility.status] || 'bg-gray-100 text-gray-600'}`}>
            {facility.status}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-3">{facility.location}</p>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <p><span className="text-gray-400">Capacity:</span> {formatCapacity(facility.capacity)}</p>
          <p>
            <span className="text-gray-400">Max hours:</span>{' '}
            {facility.max_booking_hours ?? 'No limit'}
          </p>
          <p>
            <span className="text-gray-400">Hours:</span>{' '}
            {formatTime(facility.opening_time)} – {formatTime(facility.closing_time)}
          </p>
          <p>
            <span className="text-gray-400">Fee:</span>{' '}
            {facility.requires_payment
              ? `RM ${Number(facility.price_per_booking).toFixed(2)}`
              : 'Free'}
          </p>
        </div>

        {/* Book Now button */}
        <button
          onClick={() => navigate(`/bookings/new?facility=${facility.facility_id}`)}
          disabled={facility.status !== 'available'}
          className={`mt-4 w-full py-2.5 rounded-lg text-sm font-semibold transition ${
            facility.status === 'available'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {facility.status === 'available' ? 'Book Now' : 'Unavailable'}
        </button>
        
      </div>
    </div>
  )
}

export default function Facilities() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getUser()
    getFacilities()
  }, [])

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

  async function getFacilities() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('facilities')
      .select('*')
      .order('facility_name')

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setFacilities(data ?? [])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facilities</h1>
        </div>

        {loading && (
          <p className="text-gray-500 text-sm">Loading facilities...</p>
        )}

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {!loading && !error && facilities.length === 0 && (
          <p className="text-gray-500 text-sm">No facilities found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map(facility => (
            <FacilityCard key={facility.facility_id} facility={facility} />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}

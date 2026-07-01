import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFacilityName, getFacilityImageUrl } from '../../lib/facilityImages'
import AdminNavbar from '../../components/AdminNavbar'

const FACILITY_NAMES = [
  'discussion_room_1', 'discussion_room_2', 'discussion_room_3',
  'discussion_room_4', 'discussion_room_5', 'music_room',
  'pool_table', 'table_tennis', 'stem_lab', 'event_area',
  'basketball_court', 'tennis_court', 'sport_field', 'futsal_court'
]

const defaultImage = "/facilities/default_facility.jpg"

const STATUS_OPTIONS = ['available', 'maintenance', 'closed']

const statusColors = {
  available:   'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  closed:      'bg-red-100 text-red-700',
}

const emptyForm = {
  facility_name: 'discussion_room_1',
  location: '',
  capacity: '',
  max_booking_hours: '',
  requires_payment: false,
  price_per_booking: 0,
  opening_time: '08:00',
  closing_time: '17:00',
  status: 'available',
}

export default function ManageFacilities() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [user, setUser]               = useState(null)
  const [facilities, setFacilities]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editFacility, setEditFacility] = useState(null)
  const [form, setForm]               = useState(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [deleteConfirm, setDeleteConfirm]   = useState(null)

  const [showEquipForm, setShowEquipForm]   = useState(false)
  const [equipFacility, setEquipFacility]   = useState(null)
  const [editEquip, setEditEquip]           = useState(null)
  const [equipForm, setEquipForm]           = useState({
    equipment_name: '', quantity: 1, equipment_price: 0
  })
  const [equipLoading, setEquipLoading]     = useState(false)

  const facilityName = form.facility_name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) getFacilities() }, [user])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('admins').select('*').eq('id', authUser.id).single()
    if (!data) { navigate('/'); return }
    setUser(data)
  }

  async function getFacilities() {
    setLoading(true)
    const { data } = await supabase
      .from('facilities')
      .select('*, equipment(equipment_id, equipment_name, quantity, equipment_price)')
      .eq('department', user.department)
      .order('facility_name')
    setFacilities(data || [])
    setLoading(false)
  }

  function openNewForm() {
    setEditFacility(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEditForm(facility) {
    setEditFacility(facility)
    setForm({
      facility_name:     facility.facility_name,
      location:          facility.location || '',
      capacity:          facility.capacity || '',
      max_booking_hours: facility.max_booking_hours || '',
      requires_payment:  facility.requires_payment || false,
      price_per_booking: facility.price_per_booking || 0,
      opening_time:      facility.opening_time?.slice(0, 5) || '08:00',
      closing_time:      facility.closing_time?.slice(0, 5) || '17:00',
      status:            facility.status || 'available',
    })
    setError('')
    setShowForm(true)
    setActiveDropdown(null)
  }

  async function handleSubmit() {
    if (!form.location || !form.capacity) {
      setError('Please fill in all required fields.')
      return
    }

    setFormLoading(true)
    setError('')

    const payload = {
      facility_name:     form.facility_name,
      location:          form.location,
      capacity:          parseInt(form.capacity),
      max_booking_hours: form.max_booking_hours ? parseInt(form.max_booking_hours) : null,
      requires_payment:  form.requires_payment,
      price_per_booking: form.requires_payment ? parseFloat(form.price_per_booking) : 0,
      opening_time:      form.opening_time,
      closing_time:      form.closing_time,
      status:            form.status,
      image_path:        defaultImage,
      department:        user.department,
    }

    if (editFacility) {
      const { error } = await supabase
        .from('facilities')
        .update(payload)
        .eq('facility_id', editFacility.facility_id)

      if (error) { setError(error.message); setFormLoading(false); return }
      setSuccess('Facility updated successfully!')
    } else {
      const { error } = await supabase
        .from('facilities')
        .insert(payload)

      if (error) { setError(error.message); setFormLoading(false); return }
      setSuccess('Facility added successfully!')
    }

    await getFacilities()
    setShowForm(false)
    setFormLoading(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleDelete(facilityId) {
    const { error } = await supabase
      .from('facilities')
      .delete()
      .eq('facility_id', facilityId)

    if (!error) {
      setFacilities(prev => prev.filter(f => f.facility_id !== facilityId))
      setSuccess('Facility deleted.')
      setTimeout(() => setSuccess(''), 3000)
    }
    setDeleteConfirm(null)
    setActiveDropdown(null)
  }

  async function handleImageUpload(e, facilityId) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be less than 2MB.'); return }

    setUploadingImage(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `facilities/${facilityId}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) { setError(uploadError.message); setUploadingImage(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    await supabase.from('facilities').update({ image_path: publicUrl }).eq('facility_id', facilityId)
    await getFacilities()
    setUploadingImage(false)
    setSuccess('Image updated!')
    setTimeout(() => setSuccess(''), 3000)
  }

  function openAddEquip(facility) {
  setEquipFacility(facility)
  setEditEquip(null)
  setEquipForm({ equipment_name: '', quantity: 1, equipment_price: 0 })
  setShowEquipForm(true)
  }

  function openEditEquip(facility, equip) {
    setEquipFacility(facility)
    setEditEquip(equip)
    setEquipForm({
      equipment_name:  equip.equipment_name,
      quantity:        equip.quantity,
      equipment_price: equip.equipment_price,
    })
    setShowEquipForm(true)
  }

  async function handleEquipSubmit() {
    if (!equipForm.equipment_name) return
    setEquipLoading(true)

    if (editEquip) {
      await supabase
        .from('equipment')
        .update({
          equipment_name:  equipForm.equipment_name,
          quantity:        parseInt(equipForm.quantity),
          equipment_price: parseFloat(equipForm.equipment_price),
        })
        .eq('equipment_id', editEquip.equipment_id)
    } else {
      await supabase
        .from('equipment')
        .insert({
          facility_id:     equipFacility.facility_id,
          equipment_name:  equipForm.equipment_name,
          quantity:        parseInt(equipForm.quantity),
          equipment_price: parseFloat(equipForm.equipment_price),
        })
    }

    await getFacilities()
    setShowEquipForm(false)
    setEquipLoading(false)
  }

  async function handleEquipDelete(equipId) {
    await supabase.from('equipment').delete().eq('equipment_id', equipId)
    await getFacilities()
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Facilities</h1>
          <button
            onClick={openNewForm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            + New Facility
          </button>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
            ✅ {success}
          </div>
        )}

        {/* Facilities grid */}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map(facility => (
              <div key={facility.facility_id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">

                {/* Image */}
                <div className="relative h-44 bg-gray-100">
                  <img
                    src={facility.image_path || getFacilityImageUrl(null, facility.facility_name)}
                    alt={formatFacilityName(facility.facility_name)}
                    className="w-full h-full object-cover"
                    onError={e => e.target.src = '/facilities/discussion_room.jpg'}
                  />

                  {/* Upload image button */}
                  <label className="absolute bottom-2 left-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded cursor-pointer transition">
                    {uploadingImage ? '...' : '📷 Change Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleImageUpload(e, facility.facility_id)}
                    />
                  </label>

                  {/* Status badge */}
                  <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[facility.status]}`}>
                    {facility.status}
                  </span>

                  {/* Dropdown menu */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => setActiveDropdown(
                        activeDropdown === facility.facility_id ? null : facility.facility_id
                      )}
                      className="w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >
                      ⋮
                    </button>
                    {activeDropdown === facility.facility_id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => openEditForm(facility)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(facility); setActiveDropdown(null) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {formatFacilityName(facility.facility_name)}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">{facility.location}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <p><span className="text-gray-400">Capacity:</span> {facility.capacity >= 999 ? 'No limit' : facility.capacity}</p>
                    <p><span className="text-gray-400">Max hrs:</span> {facility.max_booking_hours ?? 'No limit'}</p>
                    <p><span className="text-gray-400">Hours:</span> {facility.opening_time?.slice(0,5)} – {facility.closing_time?.slice(0,5)}</p>
                    <p><span className="text-gray-400">Fee:</span> {facility.requires_payment ? `RM ${Number(facility.price_per_booking).toFixed(2)}` : 'Free'}</p>
                  </div>

                  {/* Equipment list */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 font-medium">Equipment</p>
                      <button
                        onClick={() => openAddEquip(facility)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        + Add
                      </button>
                    </div>

                    {facility.equipment?.length > 0 ? (
                      <div className="space-y-1.5">
                        {facility.equipment.map(eq => (
                          <div key={eq.equipment_id} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{eq.equipment_name} (x{eq.quantity})</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">
                                {eq.equipment_price > 0 ? `RM ${Number(eq.equipment_price).toFixed(2)}` : 'Free'}
                              </span>
                              <button
                                onClick={() => openEditEquip(facility, eq)}
                                className="text-blue-500 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleEquipDelete(eq.equipment_id)}
                                className="text-red-500 hover:underline"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300">No equipment added</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Facility Popup */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {editFacility ? 'Edit Facility' : 'New Facility'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Facility Name */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Facility Name *</label>
                <input
                  type="text"
                  value={form.facility_name}
                  onChange={e => setForm({...form, facility_name: e.target.value })}
                  placeholder='Enter facility name'
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Level 6, Library"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Capacity *</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: e.target.value })}
                  placeholder="999 for no limit"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Max Booking Hours */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Max Booking Hours</label>
                <input
                  type="number"
                  value={form.max_booking_hours}
                  onChange={e => setForm({ ...form, max_booking_hours: e.target.value })}
                  placeholder="Leave empty for no limit"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Opening & Closing Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Opening Time *</label>
                  <input
                    type="time"
                    value={form.opening_time}
                    onChange={e => setForm({ ...form, opening_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Closing Time *</label>
                  <input
                    type="time"
                    value={form.closing_time}
                    onChange={e => setForm({ ...form, closing_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Status *</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Requires Payment */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_payment"
                  checked={form.requires_payment}
                  onChange={e => setForm({ ...form, requires_payment: e.target.checked })}
                  className="w-4 h-4 accent-red-600"
                />
                <label htmlFor="requires_payment" className="text-sm text-gray-700">Requires Payment</label>
              </div>

              {/* Price */}
              {form.requires_payment && (
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Price per Booking (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_per_booking}
                    onChange={e => setForm({ ...form, price_per_booking: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editFacility ? 'Update' : 'Add Facility'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-2">Delete Facility?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{formatFacilityName(deleteConfirm.facility_name)}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.facility_id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Add/Edit Popup */}
      {showEquipForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {editEquip ? 'Edit Equipment' : 'Add Equipment'}
              </h3>
              <button onClick={() => setShowEquipForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Equipment Name *</label>
                <input
                  type="text"
                  value={equipForm.equipment_name}
                  onChange={e => setEquipForm({ ...equipForm, equipment_name: e.target.value })}
                  placeholder="e.g. Projector"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={equipForm.quantity}
                  onChange={e => setEquipForm({ ...equipForm, quantity: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Price (RM) — 0 for free</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={equipForm.equipment_price}
                  onChange={e => setEquipForm({ ...equipForm, equipment_price: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowEquipForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEquipSubmit}
                disabled={equipLoading || !equipForm.equipment_name}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {equipLoading ? 'Saving...' : editEquip ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
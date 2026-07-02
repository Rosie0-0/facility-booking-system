import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StudentLayout from '../../components/StudentLayout'

export default function Profile() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [user, setUser]             = useState(null)
  const [avatarUrl, setAvatarUrl]   = useState('')
  const [uploading, setUploading]   = useState(false)
  const [success, setSuccess]       = useState('')
  const [error, setError]           = useState('')
  const [penalties, setPenalties]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    getUser()
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
    setAvatarUrl(data?.avatar_url || '')

    // Get active penalties
    const { data: penaltyData } = await supabase
      .from('penalties')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    setPenalties(penaltyData || [])
    setLoading(false)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB.')
      return
    }

    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setAvatarUrl(publicUrl)
      setSuccess('Profile picture updated!')
      setTimeout(() => setSuccess(''), 3000)
    }

    setUploading(false)
  }

  if (loading) {
    return (
      <StudentLayout user={user}>
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-400">Loading...</p>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout user={user}>
      <div className="max-w-2xl mx-auto px-6 py-8 w-full">

        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-6">
            ✅ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Active penalty warning */}
        {penalties.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">
                  {penalties.length >= 3
                    ? 'Your account is restricted from booking!'
                    : `You have ${penalties.length} active ${penalties.length === 1 ? 'penalty' : 'penalties'}`
                  }
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {penalties.length >= 3
                    ? 'You have reached 3 penalties. Please contact admin to resolve.'
                    : `${3 - penalties.length} more ${3 - penalties.length === 1 ? 'penalty' : 'penalties'} will restrict your booking access.`
                  }
                </p>
                <div className="mt-3 space-y-1">
                  {penalties.map(p => (
                    <div key={p.penalty_id} className="text-xs text-red-500 flex gap-2">
                      <span className="capitalize">• {p.reason.replace('_', ' ')}</span>
                      <span>— lifts on {new Date(p.lift_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">

          {/* Avatar section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <img
                src={avatarUrl || '/default_profile.jpg'}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />

              {/* Upload button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition disabled:opacity-50"
              >
                {uploading ? '...' : '📷'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-4">{user?.full_name}</h2>
            <p className="text-sm text-gray-500 mt-1">{user?.campus_id}</p>
          </div>

          {/* Profile details */}
          <div className="space-y-4">

            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Campus ID</span>
              <span className="text-sm font-medium text-gray-900">{user?.campus_id}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Full Name</span>
              <span className="text-sm font-medium text-gray-900">{user?.full_name}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium text-gray-900">{user?.campus_email}</span>
            </div>

            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="text-sm font-medium text-gray-900">{user?.phone || '—'}</span>
            </div>

          </div>
        </div>

      </div>
    </StudentLayout>
  )
}
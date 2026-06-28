import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}

export default function Announcements() {
  const navigate = useNavigate()
  const [user, setUser]                   = useState(null)
  const [title, setTitle]                 = useState('')
  const [message, setMessage]             = useState('')
  const [sending, setSending]             = useState(false)
  const [success, setSuccess]             = useState('')
  const [error, setError]                 = useState('')
  const [history, setHistory]             = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) getHistory() }, [user])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (!data || data.role !== 'admin') { navigate('/'); return }
    setUser(data)
  }

  async function getHistory() {
    setHistoryLoading(true)
    // Get distinct announcements sent by admin (general type, grouped by title+message+time)
    const { data } = await supabase
      .from('notifications')
      .select('title, message, created_at')
      .eq('type', 'general')
      .order('created_at', { ascending: false })

    // Deduplicate by created_at (same batch will have same timestamp approximately)
    const seen = new Set()
    const unique = (data || []).filter(n => {
      const key = `${n.title}-${n.message}-${n.created_at.slice(0, 16)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setHistory(unique)
    setHistoryLoading(false)
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setError('Please fill in both title and message.')
      return
    }

    setSending(true)
    setError('')

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id')

    if (usersError || !allUsers) {
      setError('Failed to fetch users.')
      setSending(false)
      return
    }

    // Send notification to all users
    const notifications = allUsers.map(u => ({
      user_id: u.id,
      title:   title.trim(),
      message: message.trim(),
      type:    'general',
    }))

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      setError(insertError.message)
    } else {
      setSuccess(`Announcement sent to ${allUsers.length} users!`)
      setTitle('')
      setMessage('')
      await getHistory()
      setTimeout(() => setSuccess(''), 4000)
    }

    setSending(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full">

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Announcements</h1>

        {/* Compose form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Send Announcement</h2>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
              ✅ {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Facility Maintenance Notice"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Message *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your announcement here..."
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                📢 Will be sent to all users ({historyLoading ? '...' : 'students, lecturers & staff'})
              </p>
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !message.trim()}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {sending ? 'Sending...' : '📢 Send Announcement'}
              </button>
            </div>
          </div>
        </div>

        {/* Announcement history */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Announcement History</h2>
          </div>

          {historyLoading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No announcements sent yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((item, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.message}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
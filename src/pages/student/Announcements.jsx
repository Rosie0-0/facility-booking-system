import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StudentLayout from '../../components/StudentLayout'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

export default function Announcements() {
  const navigate = useNavigate()
  const [user, setUser]       = useState(null)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) load() }, [user])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(data)
  }

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'general')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  return (
    <StudentLayout user={user}>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Announcements</h1>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📢</p>
            <p className="text-gray-500 text-sm">No announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(a => (
              <div key={a.notification_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-gray-900">📢 {a.title}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(a.created_at)}</p>
                </div>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}

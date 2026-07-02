import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StudentLayout from '../../components/StudentLayout'

const TABS = ['all', 'booking', 'payment', 'penalty', 'general']

const typeIcons = {
  booking: '📅',
  payment: '💳',
  penalty: '⚠️',
  general: '📢',
}

const typeColors = {
  booking: 'bg-blue-50 border-blue-200',
  payment: 'bg-green-50 border-green-200',
  penalty: 'bg-red-50 border-red-200',
  general: 'bg-yellow-50 border-yellow-200',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export default function Notifications() {
  const navigate = useNavigate()
  const [user, setUser]                   = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [activeTab, setActiveTab]         = useState('all')
  const [unreadCount, setUnreadCount]     = useState(0)

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) getNotifications()
  }, [user, activeTab])

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

  async function getNotifications() {
    setLoading(true)

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (activeTab !== 'all') {
      query = query.eq('type', activeTab)
    }

    const { data } = await query
    setNotifications(data || [])

    // Count unread
    const unread = (data || []).filter(n => !n.is_read).length
    setUnreadCount(unread)

    setLoading(false)
  }

  async function markAsRead(notificationId) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', notificationId)

    setNotifications(prev =>
      prev.map(n =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  function openNotification(n) {
    if (!n.is_read) markAsRead(n.notification_id)
    if (n.booking_id) navigate(`/bookings/${n.booking_id}`)
  }

  async function markAllAsRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <StudentLayout user={user}>
      <div className="max-w-3xl mx-auto px-6 py-8 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-red-600 hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab === 'all' ? 'All' : `${typeIcons[tab]} ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-500 text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div
                key={notification.notification_id}
                onClick={() => openNotification(notification)}
                className={`rounded-xl border p-4 cursor-pointer transition ${
                  notification.is_read
                    ? 'bg-white border-gray-100'
                    : `${typeColors[notification.type] || 'bg-blue-50 border-blue-200'}`
                }`}
              >
                <div className="flex items-start gap-3">

                  {/* Icon */}
                  <span className="text-xl mt-0.5 flex-shrink-0">
                    {typeIcons[notification.type] || '🔔'}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notification.is_read ? 'font-normal text-gray-700' : 'font-bold text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {/* Unread dot */}
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </StudentLayout>
  )
}
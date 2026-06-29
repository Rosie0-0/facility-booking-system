import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AdminNavbar from '../../components/AdminNavbar'

const TABS = ['all', 'student', 'lecturer', 'staff']

const roleColors = {
  student:  'bg-blue-100 text-blue-700',
  lecturer: 'bg-purple-100 text-purple-700',
  staff:    'bg-green-100 text-green-700',
  admin:    'bg-red-100 text-red-700',
}

export default function ManageUsers() {
  const navigate = useNavigate()
  const [user, setUser]       = useState(null)
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch]   = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [penalties, setPenalties]       = useState([])
  const [penaltyLoading, setPenaltyLoading] = useState(false)
  const [counts, setCounts]   = useState({
    all: 0, student: 0, lecturer: 0, staff: 0
  })

  useEffect(() => { getUser() }, [])
  useEffect(() => { if (user) { getUsers(); getCounts() } }, [user, activeTab])

  async function getUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { navigate('/'); return }
    const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (!data || data.role !== 'admin') { navigate('/'); return }
    setUser(data)
  }

  async function getUsers() {
    setLoading(true)
    let query = supabase
      .from('users')
      .select('*')
      .order('campus_id')

    if (activeTab !== 'all') {
      query = query.eq('role', activeTab)
    }

    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }

  async function getCounts() {
    const [all, student, lecturer, staff] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'lecturer'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'staff'),
    ])
    setCounts({
      all:      all.count      || 0,
      student:  student.count  || 0,
      lecturer: lecturer.count || 0,
      staff:    staff.count    || 0,
    })
  }

  async function openUserDetail(u) {
    setSelectedUser(u)
    setPenaltyLoading(true)
    const { data } = await supabase
      .from('penalties')
      .select('*')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })
    setPenalties(data || [])
    setPenaltyLoading(false)
  }

  async function handleLiftPenalty(penaltyId) {
    await supabase
      .from('penalties')
      .update({ status: 'lifted' })
      .eq('penalty_id', penaltyId)

    setPenalties(prev => prev.map(p =>
      p.penalty_id === penaltyId ? { ...p, status: 'lifted' } : p
    ))
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.campus_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.campus_email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AdminNavbar user={user} />

      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Users</h1>

        {/* Counts */}
        <div className="flex flex-wrap gap-4 mb-6">
          {[
            { tab: 'all',      label: 'All',      color: 'text-gray-700' },
            { tab: 'student',  label: 'Students',  color: 'text-blue-600' },
            { tab: 'lecturer', label: 'Lecturers', color: 'text-purple-600' },
            { tab: 'staff',    label: 'Staff',     color: 'text-green-600' },
          ].map(stat => (
            <div
              key={stat.tab}
              onClick={() => setActiveTab(stat.tab)}
              className={`flex-1 min-w-[100px] bg-white rounded-xl shadow-sm p-4 text-center cursor-pointer transition border-2 ${
                activeTab === stat.tab ? 'border-red-500' : 'border-transparent'
              }`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>{counts[stat.tab]}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
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
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Campus ID</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Loading...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No users found.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.campus_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{u.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.campus_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColors[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openUserDetail(u)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Popup */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-3">

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-4">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {selectedUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{selectedUser.full_name}</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColors[selectedUser.role]}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Campus ID</span>
                <span className="font-medium">{selectedUser.campus_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{selectedUser.campus_email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{selectedUser.phone || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Joined</span>
                <span className="font-medium">
                  {new Date(selectedUser.created_at).toLocaleDateString('en-MY', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>

              {/* Penalties section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Penalties {penalties.length > 0 && `(${penalties.length})`}
                </p>

                {penaltyLoading ? (
                  <p className="text-xs text-gray-400">Loading penalties...</p>
                ) : penalties.length === 0 ? (
                  <p className="text-xs text-gray-400">No penalties on record.</p>
                ) : (
                  <div className="space-y-2">
                    {penalties.map(p => (
                      <div key={p.penalty_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-gray-700 capitalize">
                            {p.reason.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-400">
                            Lifts: {new Date(p.lift_at).toLocaleDateString('en-MY', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                            p.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {p.status}
                          </span>
                          {p.status === 'active' && (
                            <button
                              onClick={() => handleLiftPenalty(p.penalty_id)}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Lift
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Validate campus email format
    const loginEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@campus\.edu\.my$/
    if (!emailRegex.test(loginEmail)) {
      setError('Please use your campus email (…@campus.edu.my).')
      setLoading(false)
      return
    }

    // Step 2: Sign in with the campus-issued credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email:    loginEmail,
      password: password,
    })

    if (signInError) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    const userId = signInData.user.id

    // Step 3: Admins are managed in the admins table → admin UI
    const { data: admin } = await supabase
      .from('admins')
      .select('department')
      .eq('id', userId)
      .single()

    if (admin) {
      navigate('/admin/dashboard', { replace: true })
      return
    }

    // Step 4: Otherwise must be an active campus member → user UI
    const { data: member } = await supabase
      .from('campus_members')
      .select('is_active')
      .eq('campus_email', loginEmail)
      .single()

    if (!member) {
      await supabase.auth.signOut()
      setError('Email not registered. Please contact admin.')
      setLoading(false)
      return
    }

    if (!member.is_active) {
      await supabase.auth.signOut()
      setError('Your account has been deactivated. Please contact admin.')
      setLoading(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex">

      {/* Left side — campus image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src="/Inti-campus-full-view.jpg"
          alt="INTI Campus"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-10">
          <p className="text-white text-3xl font-bold leading-tight">
            Campus Facility<br />Booking & Management
          </p>
          <p className="text-gray-300 mt-2 text-sm">
            INTI International College Penang
          </p>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">

          {/* Logo + title */}
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/inti-logo.png"
              alt="INTI Logo"
              className="h-15 object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h1>
          <p className="text-gray-500 text-sm mb-8">Login to your account</p>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Campus Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campus Email
              </label>
              <input
                type="email"
                placeholder="Log in using your campus email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Log in using your campus email password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotMsg(!showForgotMsg)}
                className="text-sm text-red-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Forgot password message*/}
            {showForgotMsg && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg">
                You can reset your password at the official INTI campus portal.
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            © 2026 INTI International College Penang. All Rights Reserved.
          </p>

        </div>
      </div>
    </div>
  )
}
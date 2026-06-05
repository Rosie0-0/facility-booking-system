import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [campusId, setCampusId]   = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Check if campus_id exists and is active
      const { data: member, error: memberError } = await supabase
        .from('campus_members')
        .select('campus_email, is_active, role')
        .eq('campus_id', campusId.trim())
        .single()

      if (memberError || !member) {
        setError('Campus ID not found. Please check and try again.')
        setLoading(false)
        return
      }

      if (!member.is_active) {
        setError('Your account has been deactivated. Please contact admin.')
        setLoading(false)
        return
      }

      // Step 2: Sign in with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    member.campus_email,
        password: password,
      })

      if (signInError) {
        // First time login — account doesn't exist yet
        if (signInError.message.includes('Invalid login credentials')) {
          // Step 3: Create auth account on first login
          const { error: signUpError } = await supabase.auth.signUp({
            email:    member.campus_email,
            password: password,
            options: {
              data: {
                campus_id:    campusId.trim(),
                full_name:    member.full_name,
                campus_email: member.campus_email,
                phone:        member.phone,
                role:         member.role,
              }
            }
          })

          if (signUpError) {
            setError(signUpError.message)
            setLoading(false)
            return
          }
        } else {
          setError('Incorrect password. Please try again.')
          setLoading(false)
          return
        }
      }

      // Step 4: Redirect based on role
      if (member.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left side — campus image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src="/campus.jpg"
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

            {/* Campus ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                placeholder="Enter your Campus ID"
                value={campusId}
                onChange={e => setCampusId(e.target.value)}
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
                  placeholder="Enter your password"
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
                Please contact your campus admin or IT helpdesk to reset your password.
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
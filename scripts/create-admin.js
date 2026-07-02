import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// Usage:
//   node scripts/create-admin.js <email> "<Full Name>" <department> [password]
// Example:
//   node scripts/create-admin.js afm3@campus.edu.my "AFM Admin 3" afm
//
// department must be one of: library | student_affairs | afm

const DEPARTMENTS = ['library', 'student_affairs', 'afm']
const DEFAULT_PASSWORD = 'Admin@123'

const [email, fullName, department, password = DEFAULT_PASSWORD] = process.argv.slice(2)

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1) }

if (!email || !fullName || !department) {
  fail('Usage: node scripts/create-admin.js <email> "<Full Name>" <department> [password]')
}
if (!/^[^\s@]+@campus\.edu\.my$/.test(email)) {
  fail('Email must be a @campus.edu.my address.')
}
if (!DEPARTMENTS.includes(department)) {
  fail(`Department must be one of: ${DEPARTMENTS.join(', ')}`)
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // 1. create the auth login
  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: fullName, department },
  })
  if (error) fail(`Auth create failed: ${error.message}`)

  // 2. add the admins-table row (this is what grants admin access + department)
  const { error: insErr } = await supabase.from('admins').insert({
    id: data.user.id, campus_email: email, full_name: fullName, department,
  })
  if (insErr) fail(`Auth user created but admins row failed: ${insErr.message}`)

  console.log(`✅ Admin created: ${email} (${department}) — password: ${password}`)
}
run()

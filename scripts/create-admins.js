import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// ⚠️ Must use SERVICE ROLE key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 3 department admins created by the programmer (no self-signup)
const admins = [
  { email: 'library@campus.edu.my',        full_name: 'Library Admin',         department: 'library' },
  { email: 'studentaffairs@campus.edu.my', full_name: 'Student Affairs Admin', department: 'student_affairs' },
  { email: 'afm@campus.edu.my',            full_name: 'AFM Admin',             department: 'afm' },
]

const DEFAULT_PASSWORD = 'Admin@123'

async function createAdmins() {
  console.log(`Creating ${admins.length} department admin accounts...\n`)

  for (const admin of admins) {
    // 1. Create the auth user
    const { data, error: signUpError } = await supabase.auth.admin.createUser({
      email:         admin.email,
      password:      DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: admin.full_name, department: admin.department },
    })

    if (signUpError) {
      console.log(`❌ ${admin.email}: ${signUpError.message}`)
      continue
    }

    // 2. Insert the admins-table row
    const { error: insertError } = await supabase.from('admins').insert({
      id:           data.user.id,
      campus_email: admin.email,
      full_name:    admin.full_name,
      department:   admin.department,
    })

    if (insertError) {
      console.log(`⚠️  ${admin.email}: auth created but admins row failed — ${insertError.message}`)
    } else {
      console.log(`✅ ${admin.email} (${admin.department}) created — password: ${DEFAULT_PASSWORD}`)
    }
  }

  console.log('\nDone!')
}

createAdmins()

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// ⚠️ Must use SERVICE ROLE key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAuthUsers() {
  // Get all campus members including their password
  const { data: members, error } = await supabase
    .from('campus_members')
    .select('campus_id, campus_email, full_name, phone, role, default_password')

  if (error) {
    console.error('Failed to fetch campus members:', error.message)
    return
  }

  console.log(`Found ${members.length} campus members. Creating auth accounts...\n`)

  for (const member of members) {
    const { error: signUpError } = await supabase.auth.admin.createUser({
      email:         member.campus_email,
      password:      member.default_password,
      email_confirm: true,
      user_metadata: {
        campus_id:    member.campus_id,
        full_name:    member.full_name,
        campus_email: member.campus_email,
        phone:        member.phone,
        role:         member.role
      }
    })

    if (signUpError) {
      console.log(`❌ ${member.campus_id} (${member.campus_email}): ${signUpError.message}`)
      console.log(signUpError)
    } else {
      console.log(`✅ ${member.campus_id} (${member.campus_email}): account created`)
    }
  }

  console.log('\nDone!')
}

createAuthUsers()
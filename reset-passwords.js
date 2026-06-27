import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetPasswords() {
  // Get all campus members with their passwords
  const { data: members, error } = await supabase
    .from('campus_members')
    .select('campus_id, campus_email, default_password')

  if (error) {
    console.error('Failed to fetch campus members:', error.message)
    return
  }

  console.log(`Found ${members.length} members. Resetting passwords...\n`)

  for (const member of members) {
    // Find auth user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Failed to list users:', listError.message)
      return
    }

    const authUser = users.find(u => u.email === member.campus_email)

    if (!authUser) {
      console.log(`❌ ${member.campus_id}: auth account not found`)
      continue
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: member.default_password }
    )

    if (updateError) {
      console.log(`❌ ${member.campus_id}: ${updateError.message}`)
    } else {
      console.log(`✅ ${member.campus_id}: password reset to ${member.default_password}`)
    }
  }

  console.log('\nDone!')
}

resetPasswords()
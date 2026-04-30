// {/* <h2>Reset Password</h2>

// <p>Follow this link to reset the password for your user:</p>
// <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p> */}

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://opsjzgbzwtocquwwraui.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wc2p6Z2J6d3RvY3F1d3dyYXVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyMzkwNywiZXhwIjoyMDkxMjk5OTA3fQ._hrLS3rrMaaerTjNcAbNiaLAu-1PeEUqloBCIhkSAUo' // ⚠️ must be service role
)

const TEST_EMAIL = 'jeetu.k@absstem.com'

async function sendTestReset() {
  const { error } = await supabase.auth.resetPasswordForEmail(TEST_EMAIL, {
    redirectTo: 'https://returnoninvestmentmoduleforabsstem.vercel.app/reset-password'
  })

  if (error) {
    console.error('❌ Error:', error.message)
  } else {
    console.log('✅ Reset email sent successfully!')
  }
}

sendTestReset()
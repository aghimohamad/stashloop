// supabase/functions/send-test-push/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization')
  if (!auth) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: tokens } = await supabase
    .from('device_tokens').select('token').eq('user_id', user.id)

  const to = (tokens ?? []).map(t => t.token)
  if (!to.length) return new Response(JSON.stringify({ ok:false, reason:'no_tokens' }), { status: 200 })

  // send via Expo
  const chunk = to.map(t => ({ to: t, sound: 'default', title: 'Test notification', body: 'It works 🎉' }))
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunk)
  })
  return new Response(JSON.stringify({ ok:true, sent: to.length }), { status: 200 })
})

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

export async function ensureUserSettings() {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return;
  const uid = session.user.id;

  // create if missing (defaults on the table will apply)
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: uid }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (error && error.code !== '23505') {
    // 23505 = unique violation; safe to ignore
    console.warn('ensureUserSettings error', error);
  }
}
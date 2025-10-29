// hooks/useUserSettings.ts
import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type UserSettings = {
  user_id: string
  items_per_day: number
  reminder_hour: number
  timezone: string
  push_opt_in: boolean
  last_push_at: string | null
}

async function fetchSettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('user_settings')
    .select('*').eq('user_id', user.id).single()
  if (error) throw error
  return data as UserSettings
}

async function saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('user_settings')
    .upsert({ user_id: user.id, ...patch })
    .select().single()
  if (error) throw error
  return data as UserSettings
}

export function useUserSettings() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['user_settings'], queryFn: fetchSettings })
  const m = useMutation({
    mutationFn: saveSettings,
    onSuccess: (d) => qc.setQueryData(['user_settings'], d),
  })
  return useMemo(() => ({
    settings: q.data, isLoading: q.isLoading,
    save: m.mutateAsync, saving: m.isPending,
  }), [q.data, q.isLoading, m.isPending, m.mutateAsync])
}

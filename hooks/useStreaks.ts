// lib/streaks.ts
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type Streaks = { streak: number; best_streak: number; last_streak_at: string | null }

async function fetchStreaks(): Promise<Streaks> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('no-user')
  const { data, error } = await supabase
    .from('user_settings')
    .select('streak,best_streak,last_streak_at')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data as Streaks
}

export function useStreaks() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['streaks'], queryFn: fetchStreaks })

  // Realtime: auto-update when user_settings row changes
  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      sub = supabase
        .channel('streaks-user-settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
          () => qc.invalidateQueries({ queryKey: ['streaks'] })
        )
        .subscribe()
    })()
    return () => { sub?.unsubscribe() }
  }, [qc])

  return {
    streaks: q.data,        // { streak, best_streak, last_streak_at }
    loading: q.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ['streaks'] }),
    setOptimistic(newVals: Partial<Streaks>) {
      qc.setQueryData<Streaks>(['streaks'], (prev) => ({ ...(prev ?? { streak:0,best_streak:0,last_streak_at:null }), ...newVals }))
    },
  }
}

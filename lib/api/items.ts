import dayjs from 'dayjs'
import { supabase } from '../supabase'

export type ItemStatus = 'inbox' | 'today' | 'snoozed' | 'done'

export type Item = {
  id: string
  user_id: string
  url: string
  domain: string | null
  title: string | null
  description: string | null
  thumb_url: string | null
  type: string
  status: ItemStatus
  pinned: boolean
  added_at: string
  last_seen_at: string | null
  seen_count: number
  next_at: string | null
}

export type CreateItemInput = {
  url: string
  title?: string
  description?: string
  type?: string
}

export async function fetchTodayItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'today')
    .order('pinned', { ascending: false })
    .order('added_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Item[]
}

export async function fetchInboxItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('status', ['inbox', 'snoozed'])
    .order('pinned', { ascending: false })
    .order('added_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Item[]
}

export async function createItem(input: CreateItemInput) {
  const domain = safeDomain(input.url)
  const payload = {
    url: input.url.trim(),
    status: 'inbox' satisfies ItemStatus,
    domain,
    title: input.title?.trim() || null,
    description: input.description?.trim() || null,
    type: input.type ?? 'other',
  }

  const { data, error } = await supabase.from('items').insert(payload).select().single<Item>()
  console.log(error)
  if (error) throw error

  // Kick off metadata scrape; ignore failures so the item still exists
  try {
    await supabase.functions.invoke('scrape-metadata', {
      body: { itemId: data.id, url: data.url },
    })
  } catch (fnError) {
    console.warn('scrape-metadata invoke failed', fnError)
  }

  return data
}

export async function markItemDone(id: string) {
  const { data, error } = await supabase
    .from('items')
    .update({
      status: 'done',
      pinned: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single<Item>()

  if (error) throw error
  return data
}

export async function snoozeItem(id: string, variant: 'tomorrow' | 'next_week' = 'tomorrow') {
  const next = variant === 'tomorrow' ? dayjs().add(1, 'day') : dayjs().add(7, 'day')
  const { data, error } = await supabase
    .from('items')
    .update({
      status: 'snoozed',
      next_at: next.toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single<Item>()

  if (error) throw error
  return data
}

export async function togglePin(id: string, pinned: boolean) {
  const { data, error } = await supabase
    .from('items')
    .update({ pinned: !pinned })
    .eq('id', id)
    .select()
    .single<Item>()

  if (error) throw error
  return data
}

export async function moveToToday(id: string) {
  const { data, error } = await supabase
    .from('items')
    .update({
      status: 'today',
      next_at: null,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single<Item>()

  if (error) throw error
  return data
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export async function updateStreaks() {
  // after you set an item to 'done'
const { count } = await supabase
  .from('items')
  .select('*', { head: true, count: 'exact' })
  .eq('status', 'today')

if ((count ?? 0) === 0) {
  // all today items complete -> update streak now
 const res =  await supabase.functions.invoke('update-streaks', { body: {} }).catch(() => {})
 return res
}

}

import { useEffect } from 'react'
import { Platform } from 'react-native'
import ShareMenu, { ShareMenuReactView } from 'react-native-share-menu'
import { router } from 'expo-router'

type SharedItem = {
  mimeType?: string | null
  data?: string | { value: string } | Array<{ data: string; mimeType?: string }>
  extraData?: Record<string, unknown>
}

function extractString(val: SharedItem['data']): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  // Some OEMs send { value: '...' }
  // Some files come as arrays
  if (Array.isArray(val)) {
    // pick first item path/url if present
    const first = val[0]
    if (first?.data && typeof first.data === 'string') return first.data
    return ''
  }
  // object with value
  // @ts-ignore
  return typeof val.value === 'string' ? val.value : ''
}

function firstUrlFrom(text: string): string {
  const m = text?.match(/https?:\/\/\S+/)
  return m ? m[0] : ''
}

export function ShareIntentHandler() {
  useEffect(() => {
    if (Platform.OS !== 'android') return

    // When app is cold-started from Share
    ShareMenu.getInitialShare((item: SharedItem | null) => {
      if (item) handleSharedItem(item)
    })

    // When app is already alive (foreground/background)
    const listener: ShareMenuReactView = ShareMenu.addNewShareListener(
      (item: SharedItem) => handleSharedItem(item)
    )

    return () => {
      listener?.remove?.()
    }
  }, [])

  const handleSharedItem = (item: SharedItem) => {
    const raw = extractString(item?.data)
    const url = firstUrlFrom(raw)
    const params: Record<string, string> = {
      sharedUrl: url || '',
      sharedText: raw || '',
      sharedTitle: typeof item?.extraData?.subject === 'string' ? (item.extraData!.subject as string) : '',
    }

    // navigate to your add screen
    router.push({ pathname: '/(tabs)/add', params })
    // IMPORTANT: tell Android share sheet we're done
    // ShareMenu.clearSharedData()
  }

  return null
}

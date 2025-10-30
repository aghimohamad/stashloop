import { ShareIntentHandler } from '@/components/share-intent-handler'
import { queryClient } from '@/lib/query'
import '@/lib/ui-setup'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'

export default function RootLayout() {
  // useEffect(() => { ensureNotificationPerms() }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <ShareIntentHandler />
      <Stack screenOptions={{ headerShadowVisible: false, headerShown: false  }} />
    </QueryClientProvider>
  )
}

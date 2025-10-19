import { queryClient } from '@/lib/query'
import '@/lib/ui-setup'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useEffect } from 'react'

export default function RootLayout() {
  // useEffect(() => { ensureNotificationPerms() }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShadowVisible: false, headerShown: false  }} />
    </QueryClientProvider>
  )
}

import { useTheme } from '@/lib/hooks/useTheme'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { useEffect } from 'react'
import  {registerForPushNotificationsAsync}  from '@/lib/notifications'

const iconMap: Record<string, { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  today: { filled: 'calendar', outline: 'calendar-outline' },
  inbox: { filled: 'mail', outline: 'mail-outline' },
  add: { filled: 'add-circle', outline: 'add-circle-outline' },
}

export default function TabLayout() {
  const { colors, isDark } = useTheme()
  
  useEffect(() => {
    registerForPushNotificationsAsync()
  }, [])
  return (
    <Tabs
      screenOptions={({ route }) => {
        const config = iconMap[route.name] ?? iconMap.today
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? config.filled : config.outline}
              size={size + (focused ? 2 : 0)}
              color={color}
            />
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: Platform.OS === 'ios' ? -4 : 4,
          },
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            backgroundColor: isDark ? 'rgba(17, 17, 35, 0.9)' : 'rgba(255, 255, 255, 0.92)',
            position: 'absolute',
            marginHorizontal: 16,
            marginBottom: Platform.OS === 'ios' ? 24 : 16,
            borderRadius: 24,
            height: 64,
            paddingBottom: Platform.OS === 'ios' ? 12 : 8,
            paddingTop: 8,
          },
          sceneContainerStyle: {
            backgroundColor: colors.background,
          },
        }
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
    </Tabs>
  )
}

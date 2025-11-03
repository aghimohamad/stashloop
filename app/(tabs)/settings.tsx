import { useTheme } from '@/lib/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { LinearGradient } from 'expo-linear-gradient'
import * as Notifications from 'expo-notifications'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar } from 'react-native'
import { Switch, Text, View } from 'react-native-ui-lib'

type UserSettings = {
  user_id: string
  items_per_day: number
  reminder_hour: number
  timezone: string
  push_opt_in: boolean
  last_push_at: string | null
}

async function fetchUserSettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data as UserSettings
}

async function saveUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...patch })
    .select()
    .single()
  if (error) throw error
  return data as UserSettings
}

async function registerPushToken() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId

  const token = (await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  )).data

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (userId && token) {
    await supabase.from('device_tokens')
      .upsert({ user_id: userId, token }, { onConflict: 'token' })
  }
  return token
}

async function unregisterPushTokens() {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) return
  await supabase.from('device_tokens').delete().eq('user_id', userId)
}

async function sendTestPush() {
  // your minimal function that sends to the current user’s tokens
  await supabase.functions.invoke('send-test-push', { body: {} })
}

export default function SettingsScreen() {
  const { colors, gradients, isDark } = useTheme()
  const [initial, setInitial] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // local state (no RHF)
  const [itemsPerDay, setItemsPerDay] = useState(3)
  const [reminderHour, setReminderHour] = useState(9)
  const [timezone, setTimezone] = useState('Europe/Istanbul')
  const [pushOptIn, setPushOptIn] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchUserSettings()
        setInitial(s)
        setItemsPerDay(s.items_per_day)
        setReminderHour(s.reminder_hour)
        setTimezone(s.timezone)
        setPushOptIn(s.push_opt_in)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const hasChanges = useMemo(() => {
    if (!initial) return false
    return (
      itemsPerDay !== initial.items_per_day ||
      reminderHour !== initial.reminder_hour ||
      timezone !== initial.timezone ||
      pushOptIn !== initial.push_opt_in
    )
  }, [initial, itemsPerDay, reminderHour, timezone, pushOptIn])

  async function onSave() {
    if (!hasChanges) return
    setSaving(true)
    try {
      const updated = await saveUserSettings({
        items_per_day: itemsPerDay,
        reminder_hour: reminderHour,
        timezone,
        push_opt_in: pushOptIn,
      })

      // side-effects only if push toggle changed
      if (initial && pushOptIn !== initial.push_opt_in) {
        if (pushOptIn) {
          await registerPushToken()
        } else {
          await unregisterPushTokens()
        }
      }

      setInitial(updated)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary, fontSize: 16 }}>Loading settings…</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 140,
          gap: 24,
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1], gradients.primary[2] ?? gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 28, padding: 28, gap: 16 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Preferences</Text>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700' }}>Settings</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 22 }}>
            Customize your reading experience and notification preferences.
          </Text>
        </LinearGradient>

        {/* Settings Cards */}
        <View style={{ gap: 16 }}>
          {/* Items per day */}
          <SettingCard title="Daily Items" description="How many items to surface each day">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <CounterButton
                icon="remove"
                onPress={() => setItemsPerDay(v => Math.max(1, v - 1))}
                disabled={itemsPerDay <= 1}
              />
              <View style={{ 
                backgroundColor: colors.primary, 
                borderRadius: 16, 
                paddingHorizontal: 20, 
                paddingVertical: 12,
                minWidth: 60,
                alignItems: 'center'
              }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{itemsPerDay}</Text>
              </View>
              <CounterButton
                icon="add"
                onPress={() => setItemsPerDay(v => Math.min(10, v + 1))}
                disabled={itemsPerDay >= 10}
              />
            </View>
          </SettingCard>

          {/* Reminder hour */}
          <SettingCard title="Reminder Time" description="When to send daily notifications">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <CounterButton
                icon="remove"
                onPress={() => setReminderHour(v => Math.max(0, v - 1))}
                disabled={reminderHour <= 0}
              />
              <View style={{ 
                backgroundColor: colors.primary, 
                borderRadius: 16, 
                paddingHorizontal: 20, 
                paddingVertical: 12,
                minWidth: 80,
                alignItems: 'center'
              }}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
                  {reminderHour.toString().padStart(2, '0')}:00
                </Text>
              </View>
              <CounterButton
                icon="add"
                onPress={() => setReminderHour(v => Math.min(23, v + 1))}
                disabled={reminderHour >= 23}
              />
            </View>
          </SettingCard>

          {/* Timezone */}
          <SettingCard title="Timezone" description="Your local timezone for notifications">
            <View style={{ gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{timezone}</Text>
              <ActionButton
                title="Use device timezone"
                icon="location-outline"
                onPress={() => {
                  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul'
                  setTimezone(tz)
                }}
              />
            </View>
          </SettingCard>

          {/* Notifications */}
          <SettingCard title="Push Notifications" description="Receive daily reminders">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>
                  {pushOptIn ? 'Enabled' : 'Disabled'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>
                  {pushOptIn ? 'You\'ll receive daily notifications' : 'No notifications will be sent'}
                </Text>
              </View>
              <Switch
                value={pushOptIn}
                onValueChange={setPushOptIn}
              />
            </View>
          </SettingCard>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 16 }}>
          <PrimaryButton
            title={saving ? 'Saving…' : 'Save Changes'}
            onPress={onSave}
            disabled={!hasChanges || saving}
            loading={saving}
          />

          <ActionButton
            title="Sign out"
            icon="log-out-outline"
            onPress={async () => {
              await supabase.auth.signOut()
              
            }}
            variant="danger"
          />
        </View>
      </ScrollView>
    </View>
  )
}

// Helper Components
function SettingCard({ title, description, children }: { 
  title: string
  description: string
  children: React.ReactNode 
}) {
  const { colors, shadows } = useTheme()
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>{description}</Text>
      </View>
      {children}
    </View>
  )
}

function CounterButton({ 
  icon, 
  onPress, 
  disabled 
}: { 
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean 
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: disabled ? colors.border : pressed ? `${colors.primary}20` : colors.surface,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: disabled ? colors.border : colors.primary,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={disabled ? colors.textSecondary : colors.primary} 
      />
    </Pressable>
  )
}

function ActionButton({ 
  title, 
  icon, 
  onPress, 
  variant = 'default' 
}: { 
  title: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  variant?: 'default' | 'danger'
}) {
  const { colors } = useTheme()
  const isDanger = variant === 'danger'
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? (isDanger ? '#EF444420' : `${colors.primary}10`) : colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: isDanger ? colors.error : colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      })}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isDanger ? colors.error : colors.primary} 
      />
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '600', 
        color: isDanger ? colors.error : colors.text,
        flex: 1
      }}>
        {title}
      </Text>
    </Pressable>
  )
}

function PrimaryButton({ 
  title, 
  onPress, 
  disabled, 
  loading 
}: { 
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  const { colors, gradients, shadows } = useTheme()
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        borderRadius: 16,
        overflow: 'hidden',
        ...shadows.button,
      })}
    >
      <LinearGradient
        colors={disabled ? [colors.border, colors.border] : [gradients.primary[0], gradients.primary[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {loading && <ActivityIndicator size="small" color="white" />}
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '700', 
          color: disabled ? colors.textSecondary : 'white',
          textAlign: 'center'
        }}>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  )
}
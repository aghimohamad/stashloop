import { ItemCard } from '@/components/item-card'
import { useStreaks } from '@/hooks/useStreaks'
import {
  fetchTodayItems,
  Item,
  markItemDone,
  snoozeItem,
  togglePin,
  updateStreaks,
} from '@/lib/api/items'
import { useTheme } from '@/lib/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMemo } from 'react'
import {
  ActionSheetIOS,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native'
import { Button, Text, View } from 'react-native-ui-lib'

type SnoozeVariant = 'tomorrow' | 'next_week'

export default function TodayScreen() {
  const { colors, gradients, isDark } = useTheme()
  const queryClient = useQueryClient()

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['items', 'today'],
    queryFn: fetchTodayItems,
  })

  const streakUtil = useStreaks()

  const invalidateLists = async () => {
    // after you set an item to 'done'
   const res = await updateStreaks()
   if (res) {
    const { streak, best_streak, last_streak_at } = res.data.data[0]
    streakUtil.setOptimistic({ streak, best_streak, last_streak_at })
   }
    queryClient.invalidateQueries({ queryKey: ['items', 'today'] })
    queryClient.invalidateQueries({ queryKey: ['items', 'inbox'] })
  }

  const doneMutation = useMutation({
    mutationFn: (id: string) => markItemDone(id),
    onSuccess: invalidateLists,
    onError: (error: Error) => Alert.alert('Unable to mark done', error.message),
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, variant }: { id: string; variant: SnoozeVariant }) =>
      snoozeItem(id, variant === 'tomorrow' ? 'tomorrow' : 'next_week'),
    onSuccess: invalidateLists,
    onError: (error: Error) => Alert.alert('Snooze failed', error.message),
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => togglePin(id, pinned),
    onSuccess: invalidateLists,
    onError: (error: Error) => Alert.alert('Unable to update pin', error.message),
  })

  const items = useMemo(() => data ?? [], [data])

  const onSnooze = (item: Item) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Tomorrow', 'Next week'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) snoozeMutation.mutate({ id: item.id, variant: 'tomorrow' })
          if (index === 2) snoozeMutation.mutate({ id: item.id, variant: 'next_week' })
        },
      )
    } else {
      Alert.alert('Snooze until…', undefined, [
        { text: 'Tomorrow', onPress: () => snoozeMutation.mutate({ id: item.id, variant: 'tomorrow' }) },
        { text: 'Next week', onPress: () => snoozeMutation.mutate({ id: item.id, variant: 'next_week' }) },
        { text: 'Cancel', style: 'cancel' },
      ])
    }
  }

  const hasItems = items.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 140,
          gap: 24,
        }}
      >
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1], gradients.primary[2] ?? gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            padding: 28,
            gap: 20,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Today&apos;s Loop</Text>
          
          {/* Main content row */}
          <View row centerV style={{ gap: 14 }}>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.22)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 28, fontWeight: '800' }}>{items.length}</Text>
            </View>
            <View flex style={{ gap: 6 }}>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>
                {hasItems ? 'Keep the streak alive' : 'You are all caught up'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20 }}>
                {hasItems
                  ? 'Review your resurfaced gems. Done, snooze, or pin to shape tomorrow.'
                  : 'Add more links to your inbox or explore saved items to fill tomorrow.'}
              </Text>
            </View>
          </View>

          {/* Streaks section */}
          <StreaksDisplay />

          {!hasItems && (
            <Button
              label="Add a new link"
              onPress={() => router.push('/(tabs)/add')}
              backgroundColor="rgba(255,255,255,0.18)"
              labelStyle={{ color: 'white', fontWeight: '600' }}
              style={{ borderRadius: 16, paddingVertical: 12 }}
            />
          )}
        </LinearGradient>

        {hasItems ? (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              actions={[
                {
                  label: 'Done',
                  icon: 'checkmark',
                  onPress: () => doneMutation.mutate(item.id),
                  type: 'primary',
                  disabled: doneMutation.isPending && doneMutation.variables === item.id,
                  loading: doneMutation.isPending && doneMutation.variables === item.id,
                },
                {
                  label: 'Snooze',
                  icon: 'time-outline',
                  onPress: () => onSnooze(item),
                  type: 'secondary',
                  disabled: snoozeMutation.isPending && snoozeMutation.variables?.id === item.id,
                  loading: snoozeMutation.isPending && snoozeMutation.variables?.id === item.id,
                },
                {
                  label: item.pinned ? 'Unpin' : 'Pin',
                  icon: item.pinned ? 'star-outline' : 'star',
                  onPress: () => pinMutation.mutate({ id: item.id, pinned: item.pinned }),
                  type: 'ghost',
                  disabled: pinMutation.isPending && pinMutation.variables?.id === item.id,
                  loading: pinMutation.isPending && pinMutation.variables?.id === item.id,
                },
              ]}
            />
          ))
        ) : (
          <EmptyToday />
        )}
      </ScrollView>
    </View>
  )
}

function EmptyToday() {
  const { colors, gradients } = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 24,
        borderColor: colors.border,
        padding: 24,
        gap: 14,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>No resurfaced links yet</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary }}>
        Add new links or move some from your inbox. We&apos;ll bring back fresh picks for you tomorrow.
      </Text>
      <Button
        label="Browse Inbox"
        onPress={() => router.push('/(tabs)/inbox')}
        backgroundColor={gradients.primary[0]}
        labelStyle={{ color: 'white', fontWeight: '600' }}
        style={{ borderRadius: 14, paddingVertical: 12 }}
      />
    </View>
  )
}
// Streaks Display Component
function StreaksDisplay() {
  const { streaks, loading } = useStreaks()
  
  if (loading || !streaks) {
    return null
  }

  const { streak, best_streak } = streaks
  const isOnStreak = streak > 0
  
  return (
    <View style={{ gap: 12 }}>
      {/* Streak indicator */}
      <View row centerV style={{ gap: 12 }}>
        <View
          style={{
            backgroundColor: isOnStreak ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 8,
          }}
        >
          <Ionicons 
            name={isOnStreak ? "flame" : "flame-outline"} 
            size={20} 
            color={isOnStreak ? "#10B981" : "rgba(255,255,255,0.7)"} 
          />
        </View>
        <View flex>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
            {isOnStreak ? `${streak} day streak!` : 'Start your streak'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            {isOnStreak 
              ? `Personal best: ${best_streak} days`
              : 'Complete items daily to build momentum'
            }
          </Text>
        </View>
      </View>

      {/* Streak visualization */}
      {isOnStreak && (
        <View style={{ gap: 8 }}>
          <View row centerV style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>
              PROGRESS TO PERSONAL BEST
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>
              {Math.min(streak, best_streak)}/{best_streak}
            </Text>
          </View>
          <StreakProgressBar current={streak} best={best_streak} />
        </View>
      )}
    </View>
  )
}

// Streak Progress Bar Component
function StreakProgressBar({ current, best }: { current: number; best: number }) {
  const progress = Math.min(current / best, 1)
  const isNewRecord = current > best
  
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          height: 6,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: isNewRecord ? '#F59E0B' : '#10B981',
            borderRadius: 3,
          }}
        />
      </View>
      
      {/* Milestone indicators */}
      <View row style={{ justifyContent: 'space-between', paddingHorizontal: 2 }}>
        {Array.from({ length: Math.min(best, 7) }, (_, i) => {
          const milestone = Math.ceil((best / Math.min(best, 7)) * (i + 1))
          const isReached = current >= milestone
          return (
            <View key={i} style={{ alignItems: 'center', gap: 2 }}>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isReached 
                    ? (isNewRecord && current >= milestone ? '#F59E0B' : '#10B981')
                    : 'rgba(255,255,255,0.3)',
                }}
              />
              <Text style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: 10, 
                fontWeight: '500' 
              }}>
                {milestone}
              </Text>
            </View>
          )
        })}
      </View>
      
      {isNewRecord && (
        <View row centerV style={{ gap: 6, marginTop: 4 }}>
          <Ionicons name="trophy" size={14} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
            New personal record! 🎉
          </Text>
        </View>
      )}
    </View>
  )
}
import { ItemCard } from '@/components/item-card'
import {
  fetchTodayItems,
  Item,
  markItemDone,
  snoozeItem,
  togglePin,
} from '@/lib/api/items'
import { useTheme } from '@/lib/hooks/useTheme'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  const invalidateLists = () => {
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
            gap: 16,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Today&apos;s Loop</Text>
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

import { ItemCard } from '@/components/item-card'
import {
  fetchInboxItems,
  Item,
  markItemDone,
  moveToToday,
  togglePin,
  updateStreaks,
} from '@/lib/api/items'
import { useTheme } from '@/lib/hooks/useTheme'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StatusBar } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, TextField, View } from 'react-native-ui-lib'
import { useStreaks } from '@/hooks/useStreaks'

type FilterOption = 'all' | 'inbox' | 'snoozed'

export default function InboxScreen() {
  const { colors, gradients, isDark } = useTheme()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterOption>('all')

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['items', 'inbox'],
    queryFn: fetchInboxItems,
  })
  const streakUtil = useStreaks()

  const invalidate = async () => {
    const res = await updateStreaks()
   if (res) {
    const { streak, best_streak, last_streak_at } = res.data.data[0]
    streakUtil.setOptimistic({ streak, best_streak, last_streak_at })
   }
    queryClient.invalidateQueries({ queryKey: ['items', 'inbox'] })
    queryClient.invalidateQueries({ queryKey: ['items', 'today'] })
  }

  const moveMutation = useMutation({
    mutationFn: (id: string) => moveToToday(id),
    onSuccess: invalidate,
    onError: (error: Error) => Alert.alert('Unable to move item', error.message),
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) => markItemDone(id),
    onSuccess: invalidate,
    onError: (error: Error) => Alert.alert('Unable to mark done', error.message),
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => togglePin(id, pinned),
    onSuccess: invalidate,
    onError: (error: Error) => Alert.alert('Unable to update pin', error.message),
  })

  const items = useMemo(() => data ?? [], [data])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      if (!term) return true
      const haystack = `${item.title ?? ''} ${item.description ?? ''} ${item.domain ?? ''} ${item.url}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [items, filter, search])

  const totalInbox = items.filter((item) => item.status === 'inbox').length
  const totalSnoozed = items.filter((item) => item.status === 'snoozed').length

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
          style={{ borderRadius: 28, padding: 28, gap: 16 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Saved Inbox</Text>
          <View row style={{ gap: 16 }}>
            <StatPill label="Inbox" value={totalInbox} />
            <StatPill label="Snoozed" value={totalSnoozed} />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 22 }}>
            Curate what resurfaces tomorrow. Move the gems you want to read next and archive the rest.
          </Text>
        </LinearGradient>

        <View style={{ gap: 16 }}>
          <TextField
            placeholder="Search saved links..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ color: colors.text, fontSize: 16 }}
            containerStyle={{
              borderRadius: 18,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
            leadingAccessory={<LeadingIcon color={colors.textSecondary} />}
          />

          <View row style={{ gap: 12 }}>
            <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="Inbox" active={filter === 'inbox'} onPress={() => setFilter('inbox')} />
            <FilterChip label="Snoozed" active={filter === 'snoozed'} onPress={() => setFilter('snoozed')} />
            <View flex />
            <FilterChip label="Add link" active={false} onPress={() => router.push('/(tabs)/add')} subtle />
          </View>
        </View>

        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              actions={[
                {
                  label: 'Move to Today',
                  icon: 'arrow-forward-circle',
                  onPress: () => moveMutation.mutate(item.id),
                  type: 'primary',
                  disabled: moveMutation.isPending && moveMutation.variables === item.id,
                  loading: moveMutation.isPending && moveMutation.variables === item.id,
                },
                {
                  label: item.pinned ? 'Unpin' : 'Pin',
                  icon: item.pinned ? 'star-outline' : 'star',
                  onPress: () => pinMutation.mutate({ id: item.id, pinned: item.pinned }),
                  type: 'secondary',
                  disabled: pinMutation.isPending && pinMutation.variables?.id === item.id,
                  loading: pinMutation.isPending && pinMutation.variables?.id === item.id,
                },
                {
                  label: 'Mark done',
                  icon: 'checkmark-done',
                  onPress: () => doneMutation.mutate(item.id),
                  type: 'ghost',
                  disabled: doneMutation.isPending && doneMutation.variables === item.id,
                  loading: doneMutation.isPending && doneMutation.variables === item.id,
                },
              ]}
            />
          ))
        ) : (
          <EmptyInbox />
        )}
      </ScrollView>
    </View>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function FilterChip({
  label,
  active,
  subtle,
  onPress,
}: {
  label: string
  active: boolean
  subtle?: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: active
          ? colors.primary
          : subtle
            ? 'transparent'
            : 'rgba(127,127,170,0.1)',
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: active ? 'white' : subtle ? colors.primary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function LeadingIcon({ color }: { color: string }) {
  return (
    <View centerV>
      <Ionicons name="search-outline" size={18} color={color} />
    </View>
  )
}

function EmptyInbox() {
  const { colors } = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
        padding: 24,
        gap: 12,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Inbox feels empty</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary }}>
        Save links from anywhere. They&apos;ll land here first so you can curate what resurfaces every day.
      </Text>
    </View>
  )
}

import { LinearGradient } from 'expo-linear-gradient'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar } from 'react-native'
import { Button, Card, Text, TextField, View } from 'react-native-ui-lib'
import { Ionicons } from '@expo/vector-icons'
import { createItem } from '@/lib/api/items'
import { useTheme } from '@/lib/hooks/useTheme'

const urlHints = ['https://', 'http://']

export default function AddLinkScreen() {
  const { colors, gradients, shadows, isDark } = useTheme()
  const queryClient = useQueryClient()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'article' | 'video' | 'thread' | 'other'>('article')
  const [lastSavedTitle, setLastSavedTitle] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createItem({ url, title, description, type }),
    onSuccess: (item) => {
      setLastSavedTitle(item.title ?? item.url)
      setUrl('')
      setTitle('')
      setDescription('')
      setType('article')
      queryClient.invalidateQueries({ queryKey: ['items', 'inbox'] })
      queryClient.invalidateQueries({ queryKey: ['items', 'today'] })
    },
    onError: (error: Error) => Alert.alert('Unable to save link', error.message),
  })

  const submitDisabled = useMemo(() => !isValidUrl(url) || mutation.isPending, [url, mutation.isPending])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 200,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1], gradients.primary[2] ?? gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 28,
            padding: 28,
            gap: 18,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.72)' }}>
            Save something inspiring
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: 'white', lineHeight: 32 }}>
            Drop a link. We&apos;ll queue it for tomorrow&apos;s loop.
          </Text>
          <View row style={{ gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="sparkles-outline" size={22} color="white" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 22 }}>
              Paste any URL and we&apos;ll enrich it automatically. You can add a custom title or note, too.
            </Text>
          </View>
        </LinearGradient>

        <Card
          style={[
            {
              padding: 24,
              gap: 18,
              backgroundColor: colors.surface,
              borderRadius: 26,
            },
            shadows.card,
          ]}
        >
          <FieldLabel label="Link URL" required />
          <TextField
            value={url}
            onChangeText={setUrl}
            placeholder="https://example.com/article"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ fontSize: 16, color: colors.text }}
            placeholderTextColor={colors.textSecondary}
            containerStyle={{
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
            }}
          />
          {!url && (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Tip: include {urlHints.join(' or ')} to make sure the link is valid.
            </Text>
          )}

          <FieldLabel label="Give it a title" />
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder="Optional headline to remember it by"
            style={{ fontSize: 16, color: colors.text }}
            placeholderTextColor={colors.textSecondary}
            containerStyle={{
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
            }}
          />

          <FieldLabel label="Add a quick note" />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder="Why did you save this? Jot a quick reminder."
            multiline
            numberOfLines={3}
            style={{ fontSize: 15, color: colors.text, minHeight: 120, textAlignVertical: 'top' }}
            placeholderTextColor={colors.textSecondary}
            containerStyle={{
              borderRadius: 20,
              paddingHorizontal: 18,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
            }}
          />

          <FieldLabel label="Content type" />
          <TypeSelector type={type} onChange={setType} />

          <Button
            label={mutation.isPending ? 'Saving…' : 'Save to inbox'}
            onPress={() => mutation.mutate()}
            disabled={submitDisabled}
            backgroundColor={colors.primary}
            style={{ borderRadius: 18, paddingVertical: 16, opacity: submitDisabled ? 0.6 : 1 }}
            labelStyle={{ fontSize: 16, fontWeight: '600', color: 'white' }}
          />
        </Card>

        {lastSavedTitle && (
          <View
            style={{
              padding: 22,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 12,
            }}
          >
            <View row centerV style={{ gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.success }}>Saved to inbox</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{lastSavedTitle}</Text>
            <View row style={{ gap: 12 }}>
              <Button
                label="Add another"
                onPress={() => setLastSavedTitle(null)}
                backgroundColor={colors.input}
                labelStyle={{ color: colors.text, fontWeight: '600' }}
                style={{ borderRadius: 16, paddingVertical: 12, flex: 1 }}
              />
              <Button
                label="Go to inbox"
                onPress={() => router.push('/(tabs)/inbox')}
                backgroundColor={colors.primary}
                labelStyle={{ color: 'white', fontWeight: '600' }}
                style={{ borderRadius: 16, paddingVertical: 12, flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const { colors } = useTheme()
  return (
    <View row centerV style={{ gap: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
      {required && <Text style={{ fontSize: 14, color: colors.error }}>*</Text>}
    </View>
  )
}

function TypeSelector({
  type,
  onChange,
}: {
  type: 'article' | 'video' | 'thread' | 'other'
  onChange: (type: 'article' | 'video' | 'thread' | 'other') => void
}) {
  const { colors } = useTheme()
  const options: Array<{ label: string; value: 'article' | 'video' | 'thread' | 'other'; icon: keyof typeof Ionicons.glyphMap }> = [
    { label: 'Article', value: 'article', icon: 'document-text-outline' },
    { label: 'Video', value: 'video', icon: 'videocam-outline' },
    { label: 'Thread', value: 'thread', icon: 'chatbubble-ellipses-outline' },
    { label: 'Other', value: 'other', icon: 'ellipse-outline' },
  ]

  return (
    <View row style={{ gap: 12, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const active = option.value === type
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 18,
              backgroundColor: active ? colors.primary : 'transparent',
              borderWidth: active ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={active ? 'white' : colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: active ? 'white' : colors.text,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function isValidUrl(candidate: string) {
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

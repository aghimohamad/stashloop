import { Item } from '@/lib/api/items'
import { useTheme } from '@/lib/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { memo } from 'react'
import { ActivityIndicator, Image, Linking, Platform, Pressable } from 'react-native'
import { Text, View } from 'react-native-ui-lib'

type CardAction = {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  type?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  loading?: boolean
}

type Props = {
  item: Item
  actions?: CardAction[]
  compact?: boolean
}

function ItemCardComponent({ item, actions = [], compact = false }: Props) {
  const { colors, gradients, shadows } = useTheme()

  const hasThumb = Boolean(item.thumb_url)
  const handleOpenLink = () => {
    if (!item.url) return
    Linking.openURL(item.url).catch((err) => console.warn('Link open failed', err))
  }

  return (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 20,
        padding: compact ? 18 : 24,
        marginBottom: 20,
        overflow: 'hidden',
      }}
    >
      <View style={{ gap: compact ? 12 : 16 }}>
        <View row spread centerV>
          <View row centerV style={{ gap: 8 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.18)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="link-outline" size={18} color="white" />
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
                {item.domain ?? 'Saved link'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {new Date(item.added_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {item.pinned && (
            <View row centerV style={{ gap: 6 }}>
              <Ionicons name="star" size={16} color={colors.secondary} />
              <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 12 }}>Pinned</Text>
            </View>
          )}
        </View>

        <Pressable onPress={handleOpenLink}>
          <View style={{ gap: 10 }}>
            <Text style={{ color: 'white', fontSize: compact ? 20 : 22, fontWeight: '700', lineHeight: 28 }}>
              {item.title ?? item.url}
            </Text>
            {item.description && (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20 }}>
                {item.description}
              </Text>
            )}
          </View>
        </Pressable>

        {hasThumb && (
          <View
            style={[
              {
                borderRadius: 16,
                overflow: 'hidden',
                height: 160,
                marginTop: compact ? 8 : 4,
              },
              shadows.card,
            ]}
          >
            <Image
              source={{ uri: item.thumb_url ?? undefined }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        {actions.length > 0 && (
          <View row style={{ gap: 12, flexWrap: 'wrap' }}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                disabled={action.disabled}
                style={[
                  {
                    flexGrow: action.type === 'primary' ? 1 : 0,
                    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
                    borderRadius: 14,
                    paddingHorizontal: 18,
                    backgroundColor:
                      action.type === 'primary'
                        ? colors.primary
                        : action.type === 'secondary'
                          ? 'rgba(255,255,255,0.15)'
                          : 'transparent',
                    borderWidth: action.type === 'ghost' ? 1 : 0,
                    borderColor: action.type === 'ghost' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    opacity: action.disabled ? 0.6 : 1,
                  },
                  shadows.button,
                ]}
              >
                {action.loading ? (
                  <ActivityIndicator
                    size="small"
                    color={action.type === 'primary' ? 'white' : 'rgba(255,255,255,0.85)'}
                  />
                ) : (
                  <View row centerV style={{ gap: 8 }}>
                    <Ionicons
                      name={action.icon}
                      color={action.type === 'primary' ? 'white' : 'rgba(255,255,255,0.8)'}
                      size={16}
                    />
                    <Text
                      style={{
                        color: action.type === 'primary' ? 'white' : 'rgba(255,255,255,0.85)',
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      {action.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  )
}

export const ItemCard = memo(ItemCardComponent)

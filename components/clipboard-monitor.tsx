import { useTheme } from '@/lib/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useEffect, useState } from 'react'
import { AppState, TextInput } from 'react-native'
import { Button, Text, TextField, View } from 'react-native-ui-lib'

interface ClipboardMonitorProps {
  onUrlDetected: (url: string) => void
}

export function ClipboardMonitor({ onUrlDetected }: ClipboardMonitorProps) {
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)
  const [lastCheckedClipboard, setLastCheckedClipboard] = useState<string>('')
  const [showManualInput, setShowManualInput] = useState(false)
  const { colors } = useTheme()

  useEffect(() => {
    checkClipboard()
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkClipboard()
      }
    })

    return () => subscription?.remove()
  }, [])

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync()
      
      if (clipboardContent && clipboardContent !== lastCheckedClipboard) {
        setLastCheckedClipboard(clipboardContent)
        
        if (isValidUrl(clipboardContent)) {
          setClipboardUrl(clipboardContent)
        } else {
          // Try to extract URL from text
          const extractedUrl = extractUrlFromText(clipboardContent)
          if (extractedUrl && isValidUrl(extractedUrl)) {
            setClipboardUrl(extractedUrl)
          } else {
            setClipboardUrl(null)
          }
        }
      }
    } catch (error) {
      console.log('Error checking clipboard:', error)
    }
  }

  const isValidUrl = (candidate: string): boolean => {
    try {
      const parsed = new URL(candidate.trim())
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }

  const extractUrlFromText = (text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex)
    return matches ? matches[0] : ''
  }

  const handleUseClipboardUrl = () => {
    if (clipboardUrl) {
      onUrlDetected(clipboardUrl)
      setClipboardUrl(null)
    }
  }

  const dismissClipboardUrl = () => {
    setClipboardUrl(null)
  }

  if (!clipboardUrl && !showManualInput) {
    return (
      <View
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 16,
        }}
      >
        <View row centerV style={{ gap: 12, marginBottom: 12 }}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            Share Intent Simulation
          </Text>
        </View>
        
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 }}>
          Copy a YouTube URL and return to this screen, or use the manual input below.
        </Text>
        
        <Button
          label="📱 Simulate Share Intent"
          onPress={() => setShowManualInput(true)}
          backgroundColor={colors.primary}
          labelStyle={{ color: 'white', fontWeight: '600', fontSize: 14 }}
          style={{ borderRadius: 12, paddingVertical: 12 }}
        />
      </View>
    )
  }

  if (showManualInput) {
    return <ManualShareInput onUrlSubmit={onUrlDetected} onCancel={() => setShowManualInput(false)} />
  }

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: 16,
      }}
    >
      <View row centerV style={{ gap: 12, marginBottom: 12 }}>
        <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
          URL detected in clipboard
        </Text>
      </View>
      
      <Text 
        style={{ 
          fontSize: 13, 
          color: colors.textSecondary, 
          marginBottom: 16,
          lineHeight: 18 
        }}
        numberOfLines={2}
      >
        {clipboardUrl}
      </Text>
      
      <View row style={{ gap: 8 }}>
        <Button
          label="Use this URL"
          onPress={handleUseClipboardUrl}
          backgroundColor={colors.primary}
          labelStyle={{ color: 'white', fontWeight: '600', fontSize: 14 }}
          style={{ borderRadius: 12, paddingVertical: 10, flex: 1 }}
        />
        <Button
          label="Dismiss"
          onPress={dismissClipboardUrl}
          backgroundColor="transparent"
          labelStyle={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}
          style={{ 
            borderRadius: 12, 
            paddingVertical: 10, 
            borderWidth: 1, 
            borderColor: colors.border,
            flex: 1 
          }}
        />
      </View>
    </View>
  )
}

function ManualShareInput({ onUrlSubmit, onCancel }: { onUrlSubmit: (url: string) => void, onCancel: () => void }) {
  const [inputUrl, setInputUrl] = useState('')
  const { colors } = useTheme()

  const handleSubmit = () => {
    if (inputUrl.trim()) {
      onUrlSubmit(inputUrl.trim())
      onCancel()
    }
  }

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: 16,
      }}
    >
      <View row centerV style={{ gap: 12, marginBottom: 12 }}>
        <Ionicons name="link-outline" size={20} color={colors.primary} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
          Simulate Shared URL
        </Text>
      </View>
      
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
        Paste a URL here to simulate receiving it via share intent:
      </Text>
      
      <TextField
        value={inputUrl}
        onChangeText={setInputUrl}
        placeholder="https://www.youtube.com/watch?v=..."
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={{ fontSize: 14, color: colors.text }}
        placeholderTextColor={colors.textSecondary}
        containerStyle={{
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
          marginBottom: 12,
        }}
      />
      
      <View row style={{ gap: 8 }}>
        <Button
          label="Use URL"
          onPress={handleSubmit}
          disabled={!inputUrl.trim()}
          backgroundColor={colors.primary}
          labelStyle={{ color: 'white', fontWeight: '600', fontSize: 14 }}
          style={{ borderRadius: 12, paddingVertical: 10, flex: 1, opacity: !inputUrl.trim() ? 0.6 : 1 }}
        />
        <Button
          label="Cancel"
          onPress={onCancel}
          backgroundColor="transparent"
          labelStyle={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}
          style={{ 
            borderRadius: 12, 
            paddingVertical: 10, 
            borderWidth: 1, 
            borderColor: colors.border,
            flex: 1 
          }}
        />
      </View>
    </View>
  )
}
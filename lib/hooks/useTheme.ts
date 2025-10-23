import { useColorScheme, ViewStyle } from 'react-native'
import { Colors } from 'react-native-ui-lib'

export function useTheme() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const primaryGradient: readonly [string, string, string] = [
    Colors.gradientStart,
    Colors.gradientMiddle,
    Colors.gradientEnd,
  ]
  const cardGradient: readonly [string, string] = isDark
    ? ['rgba(37, 38, 89, 0.9)', 'rgba(37, 38, 89, 0.7)']
    : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']

  const gradients: { primary: readonly [string, string, string]; card: readonly [string, string] } = {
    primary: primaryGradient,
    card: cardGradient,
  }

  return {
    isDark,
    colors: {
      // Backgrounds
      background: isDark ? Colors.backgroundDark : Colors.backgroundLight,
      surface: isDark ? Colors.surfaceDark : Colors.surfaceLight,
      card: isDark ? Colors.cardDark : Colors.cardLight,
      input: isDark ? Colors.inputDark : Colors.inputLight,
      
      // Text
      text: isDark ? Colors.textDark : Colors.textLight,
      textSecondary: isDark ? Colors.textSecondaryDark : Colors.textSecondaryLight,
      
      // Borders
      border: isDark ? Colors.borderDark : Colors.borderLight,
      
      // Brand colors
      primary: Colors.primary,
      primaryLight: Colors.primaryLight,
      primaryDark: Colors.primaryDark,
      secondary: Colors.secondary,
      accent: Colors.accent,
      
      // Status colors
      success: Colors.success,
      error: Colors.error,
      warning: Colors.warning,
      info: Colors.info,
      
      // Gradients
      gradientStart: Colors.gradientStart,
      gradientMiddle: Colors.gradientMiddle,
      gradientEnd: Colors.gradientEnd,
      
      // Glass effect
      glass: isDark ? Colors.glassDark : Colors.glassLight,
    },
    shadows: {
      card: isDark ? darkCardShadow : lightCardShadow,
      button: isDark ? darkButtonShadow : lightButtonShadow,
    },
    gradients,
  }
}
const lightCardShadow: ViewStyle = {
  shadowColor: '#6366F1',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 6,
}

const darkCardShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.45,
  shadowRadius: 24,
  elevation: 10,
}

const lightButtonShadow: ViewStyle = {
  shadowColor: '#6366F1',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 4,
}

const darkButtonShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 6,
}

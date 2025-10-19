import { useColorScheme } from 'react-native'
import { Colors, Shadows } from 'react-native-ui-lib'

export function useTheme() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

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
      card: isDark ? Shadows.cardDark : Shadows.cardLight,
      button: isDark ? Shadows.buttonDark : Shadows.buttonLight,
    },
    gradients: {
      primary: [Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd],
      card: isDark 
        ? ['rgba(37, 38, 89, 0.9)', 'rgba(37, 38, 89, 0.7)']
        : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
    },
  }
}
import { BorderRadiuses, Colors, Shadows, Spacings, Typography } from 'react-native-ui-lib'

// Modern, cohesive design system
Colors.loadColors({
  // Brand colors - Modern gradient-friendly palette
  primary: '#6366F1',        // Indigo
  primaryLight: '#818CF8',   // Light indigo
  primaryDark: '#4F46E5',    // Dark indigo
  secondary: '#EC4899',      // Pink
  accent: '#10B981',         // Emerald
  
  // Status colors
  success: '#10B981',        // Emerald
  error: '#EF4444',          // Red
  warning: '#F59E0B',        // Amber
  info: '#3B82F6',           // Blue
  
  // Light theme - Clean and modern
  backgroundLight: '#FAFAFA',     // Warm gray
  surfaceLight: '#FFFFFF',        // Pure white
  cardLight: '#FFFFFF',           // Pure white
  textLight: '#111827',           // Gray 900
  textSecondaryLight: '#6B7280',  // Gray 500
  borderLight: '#E5E7EB',         // Gray 200
  inputLight: '#F9FAFB',          // Gray 50
  
  // Dark theme - Rich and elegant
  backgroundDark: '#0F0F23',      // Deep navy
  surfaceDark: '#1A1B3A',         // Navy
  cardDark: '#252659',            // Purple navy
  textDark: '#F8FAFC',            // Slate 50
  textSecondaryDark: '#94A3B8',   // Slate 400
  borderDark: '#334155',          // Slate 700
  inputDark: '#1E293B',           // Slate 800
  
  // Gradient colors
  gradientStart: '#6366F1',       // Primary
  gradientMiddle: '#8B5CF6',      // Purple
  gradientEnd: '#EC4899',         // Pink
  
  // Glass effect colors
  glassLight: 'rgba(255, 255, 255, 0.8)',
  glassDark: 'rgba(37, 38, 89, 0.8)',
})

Typography.loadTypographies({
  // Modern typography scale
  hero: { fontSize: 48, fontWeight: '800', lineHeight: 56 },
  heading1: { fontSize: 36, fontWeight: '700', lineHeight: 44 },
  heading2: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  heading3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  heading4: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  captionMedium: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  smallMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
})

Spacings.loadSpacings({
  // Consistent spacing scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  page: 20,
  card: 16,
  section: 24,
})

BorderRadiuses.loadBorders({
  // Modern border radius scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
  card: 16,
  button: 12,
  input: 8,
})

Shadows.loadShadows({
  // Subtle, modern shadows
  cardLight: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonLight: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
})
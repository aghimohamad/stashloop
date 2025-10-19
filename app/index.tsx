import { useTheme } from '@/lib/hooks/useTheme'
import { ensureUserSettings, supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { Dimensions } from 'react-native'
import {
  Button,
  Card,
  LoaderScreen,
  Text,
  TextField,
  View
} from 'react-native-ui-lib'

const { width } = Dimensions.get('window')

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { isDark, colors, shadows, gradients } = useTheme()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // router.replace('/(tabs)')
      }
    })
  }, [])

  async function onLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      ensureUserSettings()
      // router.replace('/(tabs)')
    } else {
      console.error('Login error:', error.message)
    }
    setLoading(false)
  }

  async function onSignup() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (!error) {
      // router.replace('/(tabs)')
    } else {
      console.error('Signup error:', error.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <LoaderScreen message="Please wait..." backgroundColor="transparent" />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />
      
      <View flex paddingH-xl paddingT-xxxl>
        {/* Hero Section */}
        <View centerH marginB-xxxl paddingT-xxxl>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="medical" size={40} color="white" />
          </View>
          
          <Text
            style={{
              fontSize: 32,
              fontWeight: '800',
              color: 'white',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            FamilyMeds
          </Text>
          
          <Text
            style={{
              fontSize: 16,
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            {isSignUp 
              ? 'Create your account to start managing\nyour family\'s medications' 
              : 'Welcome back! Sign in to continue\nmanaging your family\'s health'
            }
          </Text>
        </View>

        {/* Login Card */}
        <Card
          padding-xxl
          style={[
            {
              backgroundColor: colors.glass,
              borderRadius: 24,
              backdropFilter: 'blur(20px)',
            },
            shadows.card,
          ]}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>

          {/* Email Field */}
          <View marginB-lg>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Email
            </Text>
            <TextField
              containerStyle={{
                backgroundColor: colors.input,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              style={{
                fontSize: 16,
                color: colors.text,
              }}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password Field */}
          <View marginB-xxl>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Password
            </Text>
            <TextField
              containerStyle={{
                backgroundColor: colors.input,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              style={{
                fontSize: 16,
                color: colors.text,
              }}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {/* Primary Action Button */}
          <Button
            onPress={isSignUp ? onSignup : onLogin}
            disabled={!email || !password}
            style={[
              {
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                marginBottom: 16,
                opacity: (!email || !password) ? 0.6 : 1,
              },
              shadows.button,
            ]}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: 'white',
              }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          </Button>

          {/* Divider */}
          <View row centerV marginV-lg>
            <View flex height={1} style={{ backgroundColor: colors.border }} />
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginHorizontal: 16,
              }}
            >
              or
            </Text>
            <View flex height={1} style={{ backgroundColor: colors.border }} />
          </View>

          {/* Secondary Action Button */}
          <Button
            onPress={() => setIsSignUp(!isSignUp)}
            style={{
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: colors.text,
              }}
            >
              {isSignUp ? 'Already have an account?' : 'Create new account'}
            </Text>
          </Button>
        </Card>

        {/* Footer */}
        <View centerH paddingT-xxl paddingB-xl>
          <Text
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            By continuing, you agree to our{'\n'}Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </LinearGradient>
  )
}

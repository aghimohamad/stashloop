# Google Authentication Setup Guide

## 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:54321/auth/v1/callback` (for local development)
     - `https://your-project-ref.supabase.co/auth/v1/callback` (for production)
   - Note down the Client ID and Client Secret

## 2. Environment Variables

Add these to your `.env.local` file:

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_client_id_here
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_client_secret_here
```

## 3. Supabase Dashboard Setup

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Add your Google Client ID and Client Secret
5. Set the redirect URL to: `stashloop://auth/callback`

## 4. Mobile App Configuration

The app is already configured with:
- URL scheme: `stashloop://`
- OAuth redirect handling
- Deep link processing

## 5. Testing

1. Start your Supabase local development: `supabase start`
2. Run your app: `npm start`
3. Try signing in with Google

## Notes

- The Google Sign-In will open a web browser for authentication
- After successful authentication, users will be redirected back to the app
- User settings will be automatically created for new Google sign-ins
- The implementation supports both sign-in and sign-up flows
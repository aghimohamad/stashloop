// Test utilities for share intent functionality
// Only available in development mode

export const testShareIntents = {
  youtube: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up',
    text: 'Check out this classic music video!'
  },
  
  article: {
    url: 'https://www.example.com/article/how-to-code',
    title: 'How to Code: A Beginner\'s Guide',
    text: 'Great article about learning to code'
  },
  
  twitter: {
    url: 'https://twitter.com/user/status/123456789',
    title: 'Interesting Tweet',
    text: 'Found this interesting tweet thread'
  },
  
  reddit: {
    url: 'https://www.reddit.com/r/programming/comments/abc123/cool_project/',
    title: 'Cool Programming Project',
    text: 'Check out this cool project on Reddit'
  },
  
  tiktok: {
    url: 'https://www.tiktok.com/@user/video/123456789',
    title: 'Funny TikTok Video',
    text: 'This TikTok made me laugh!'
  }
}

export const getRandomTestIntent = () => {
  const intents = Object.values(testShareIntents)
  return intents[Math.floor(Math.random() * intents.length)]
}
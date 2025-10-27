import { Platform } from 'react-native'

export interface ShareIntentData {
  text?: string
  url?: string
  title?: string
}

export class ShareIntentManager {
  private static instance: ShareIntentManager
  private pendingShareData: ShareIntentData | null = null

  static getInstance(): ShareIntentManager {
    if (!ShareIntentManager.instance) {
      ShareIntentManager.instance = new ShareIntentManager()
    }
    return ShareIntentManager.instance
  }

  async checkForShareIntent(): Promise<ShareIntentData | null> {
    if (Platform.OS !== 'android') {
      return null
    }

    try {
      // For Android, we'll use a different approach
      // This is a simplified version - in production you might need a native module
      return this.pendingShareData
    } catch (error) {
      console.log('Error checking for share intent:', error)
      return null
    }
  }

  setPendingShareData(data: ShareIntentData) {
    this.pendingShareData = data
  }

  clearPendingShareData() {
    this.pendingShareData = null
  }

  extractUrlFromText(text: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex)
    return matches ? matches[0] : ''
  }

  isValidUrl(candidate: string): boolean {
    try {
      const parsed = new URL(candidate)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }

  detectContentType(url: string): 'article' | 'video' | 'thread' | 'other' {
    const urlLower = url.toLowerCase()
    
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || 
        urlLower.includes('vimeo.com') || urlLower.includes('tiktok.com') ||
        urlLower.includes('instagram.com/reel') || urlLower.includes('instagram.com/p')) {
      return 'video'
    }
    
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || 
        urlLower.includes('threads.net') || urlLower.includes('reddit.com')) {
      return 'thread'
    }
    
    return 'article'
  }
}
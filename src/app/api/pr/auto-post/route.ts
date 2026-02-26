import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

interface ApprovedPost {
  id: string
  account: 'onde' | 'frh' | 'magmatic'
  content: string
  media_files?: string
  auto_post: number
}

// Twitter API credentials by account
function getTwitterCredentials(account: string, env: Record<string, string>) {
  const accountKey = account === 'onde' ? 'ONDE' : account === 'frh' ? 'FREERIVERHOUSE' : 'MAGMATIC'
  return {
    apiKey: env[`X_${accountKey}_API_KEY`],
    apiSecret: env[`X_${accountKey}_API_SECRET`],
    accessToken: env[`X_${accountKey}_ACCESS_TOKEN`],
    accessTokenSecret: env[`X_${accountKey}_ACCESS_TOKEN_SECRET`]
  }
}

// Post to Twitter using OAuth 1.0a
async function postToTwitter(
  content: string,
  credentials: { apiKey: string; apiSecret: string; accessToken: string; accessTokenSecret: string }
): Promise<{ success: boolean; tweet_id?: string; url?: string; error?: string }> {
  try {
    // Use Twitter API v2 with OAuth 1.0a User Context
    const url = 'https://api.twitter.com/2/tweets'

    // Create OAuth signature
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = Math.random().toString(36).substring(2)

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: credentials.apiKey,
      oauth_token: credentials.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0'
    }

    // Create signature base string
    const method = 'POST'
    const baseUrl = url
    const sortedParams = Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`).join('&')
    const signatureBase = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`

    // Sign with HMAC-SHA1
    const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`

    // Use Web Crypto API for HMAC-SHA1
    const encoder = new TextEncoder()
    const keyData = encoder.encode(signingKey)
    const messageData = encoder.encode(signatureBase)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))

    oauthParams.oauth_signature = signatureBase64

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
      `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
    ).join(', ')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: content })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      return { success: false, error: `Twitter API error: ${response.status}` }
    }

    const data = await response.json() as { data: { id: string } }
    const tweetId = data.data?.id

    return {
      success: true,
      tweet_id: tweetId,
      url: tweetId ? `https://x.com/i/status/${tweetId}` : undefined
    }
  } catch (error) {
    console.error('postToTwitter error:', error)
    return { success: false, error: String(error) }
  }
}

// Notify Telegram about posted tweet
async function notifyTelegram(
  account: string,
  content: string,
  postUrl: string,
  env: Record<string, string>
): Promise<void> {
  try {
    const botToken = env.TELEGRAM_BOT_TOKEN
    const chatId = env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) return

    const message = `Posted to @${account === 'onde' ? 'Onde_FRH' : account === 'frh' ? 'FreeRiverHouse' : 'magmatic__'}:\n\n${content.substring(0, 100)}...\n\n${postUrl}`

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: false
      })
    })
  } catch (error) {
    console.error('Telegram notify error:', error)
  }
}

// GET /api/pr/auto-post - Called by Cloudflare Cron to process approved posts
// POST /api/pr/auto-post - Called after approval to post immediately
export async function GET() {
  return processApprovedPosts()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return processApprovedPosts(body.post_id)
}

async function processApprovedPosts(specificPostId?: string) {
  try {
    const { env } = getRequestContext()
    const db = env.DB

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Find approved posts ready to post
    let query = `
      SELECT * FROM posts
      WHERE status = 'approved'
      AND auto_post = 1
      AND posted_at IS NULL
    `
    const params: string[] = []

    if (specificPostId) {
      query += ' AND id = ?'
      params.push(specificPostId)
    }

    query += ' ORDER BY approved_at ASC LIMIT 5'

    const result = await db.prepare(query).bind(...params).all<ApprovedPost>()
    const posts = result.results || []

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No approved posts to process',
        processed: 0
      })
    }

    const results: Array<{ id: string; success: boolean; url?: string; error?: string }> = []

    for (const post of posts) {
      const credentials = getTwitterCredentials(post.account, env as unknown as Record<string, string>)

      if (!credentials.apiKey || !credentials.accessToken) {
        console.error(`Missing Twitter credentials for account: ${post.account}`)
        results.push({ id: post.id, success: false, error: 'Missing credentials' })
        continue
      }

      // Post to Twitter
      const tweetResult = await postToTwitter(post.content, credentials)

      if (tweetResult.success && tweetResult.url) {
        // Update post as posted
        await db.prepare(`
          UPDATE posts
          SET status = 'posted', posted_at = ?, post_url = ?, twitter_post_id = ?, posted_from = 'auto'
          WHERE id = ?
        `).bind(
          new Date().toISOString(),
          tweetResult.url,
          tweetResult.tweet_id,
          post.id
        ).run()

        // Log activity
        try {
          await db.prepare(`
            INSERT INTO activity_log (type, title, description, actor, created_at)
            VALUES ('post_posted', ?, ?, 'auto-post', ?)
          `).bind(
            `Posted to @${post.account}`,
            tweetResult.url,
            new Date().toISOString()
          ).run()
        } catch { /* ignore */ }

        // Notify Telegram
        await notifyTelegram(post.account, post.content, tweetResult.url, env as unknown as Record<string, string>)

        results.push({ id: post.id, success: true, url: tweetResult.url })
      } else {
        // Mark error but don't change status (will retry)
        await db.prepare(`
          UPDATE posts SET error = ? WHERE id = ?
        `).bind(tweetResult.error || 'Unknown error', post.id).run()

        results.push({ id: post.id, success: false, error: tweetResult.error })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Auto-post error:', error)
    return NextResponse.json({ error: 'Auto-post failed' }, { status: 500 })
  }
}

import { TwitterApi } from 'twitter-api-v2';
import { createHmac } from 'crypto';
import { getCachedUserTweets, storeUserTweets } from './db';
import { getSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Initialize the Twitter client with OAuth 2.0 credentials
const twitter = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
});

// eslint-disable-next-line prefer-const
let authenticatedClient: TwitterApi | null = null;

// Create a client with bearer token for app-only operations
const appOnlyClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!);

// Function to get the appropriate client based on the operation
// This now accepts an access token to create a user-authenticated client when needed
async function getClient(accessToken?: string) {
  // If an access token is provided, create a user-authenticated client
  if (accessToken) {
    return new TwitterApi(accessToken);
  }
  
  // For operations that require user authentication but no token was provided,
  // try to get the token from the session
  if (!authenticatedClient) {
    try {
      // For server components/API routes
      const session = await getServerSession(authOptions);
      if (session?.accessToken) {
        return new TwitterApi(session.accessToken);
      }
    } catch (error) {
      console.warn('Could not get server session, falling back to app-only client');
    }
  }
  
  // Fall back to the app-only client for operations that don't require user auth
  return appOnlyClient;
}

export type Tweet = {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
};

export type TwitterError = {
  code: number;
  message: string;
};

export class TwitterClientError extends Error {
  constructor(public error: any) {
    super(error.message);
    this.name = 'TwitterClientError';
  }
}

export async function postTweet(text: string, replyToId?: string): Promise<any> {
  try {
    console.log(`Posting tweet${replyToId ? ' as reply' : ''}: ${text}`);
    
    // Check if we're in mock mode
    if (process.env.MOCK_TWITTER_API === 'true') {
      console.log('Using mock Twitter API for posting tweet');
      return {
        id: 'mock-tweet-id-' + Date.now(),
        text: text,
      };
    }
    
    // Verify that we have all required credentials before making the API call
    const requiredEnvVars = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_SECRET'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required Twitter API credentials: ${missingVars.join(', ')}`);
      throw new TwitterClientError({
        error: true,
        code: 401,
        data: {
          title: 'Configuration Error',
          detail: `Missing Twitter API credentials: ${missingVars.join(', ')}`,
          status: 401
        }
      });
    }
    
    // Create a Twitter client with OAuth 1.0a credentials for posting tweets
    // This is different from the app-only client used for reading tweets
    const userClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
    
    console.log('Twitter client created with OAuth 1.0a credentials');
    
    // Create the request payload
    const payload: any = {
      text: text,
    };
    
    // Add reply parameters if this is a reply
    if (replyToId) {
      payload.reply = {
        in_reply_to_tweet_id: replyToId
      };
    }
    
    // Make the API request using the v2 API
    console.log('Sending tweet with payload:', JSON.stringify(payload));
    const response = await userClient.v2.tweet(text, replyToId ? {
      reply: {
        in_reply_to_tweet_id: replyToId
      }
    } : undefined);
    
    console.log('Tweet posted successfully:', response.data.id);
    return response.data;
  } catch (error: any) {
    console.error('Error posting tweet:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Provide more specific error messages for common issues
    if (error.code === 401 || (error.errors && error.errors[0]?.code === 32)) {
      console.error('Twitter API authentication failed. Check your credentials.');
      throw new TwitterClientError({
        error: true,
        code: 401,
        data: {
          title: 'Authentication Failed',
          detail: 'Twitter API authentication failed. Your API keys or tokens may be invalid or expired.',
          status: 401
        }
      });
    } else if (error.code === 403 || (error.errors && error.errors[0]?.code === 220)) {
      console.error('Twitter API permission denied. Check your app permissions.');
      throw new TwitterClientError({
        error: true,
        code: 403,
        data: {
          title: 'Permission Denied',
          detail: 'Your Twitter app may not have the required permissions to post tweets.',
          status: 403
        }
      });
    }
    
    // For other errors, pass through the original error with more details
    throw new TwitterClientError({
      error: true,
      code: error.code || 500,
      data: {
        title: 'Twitter API Error',
        detail: error.message || 'Unknown error occurred when posting tweet',
        errors: error.errors || [],
        status: error.code || 500
      }
    });
  }
}

export async function setupWebhook(webhookUrl: string): Promise<any> {
  try {
    // Register webhook URL with Twitter
    const webhook = await getClient().v2.createWebhook({
      url: webhookUrl,
      enabled: true,
    });

    // Subscribe to tweet events
    await getClient().v2.subscribeToWebhook(webhook.id, {
      tweet: {
        events: ['tweet_create'],
      },
    });

    return webhook.data;
  } catch (error) {
    console.error('Error setting up webhook:', error);
    throw new TwitterClientError(error);
  }
}

export async function getUserByUsername(username: string): Promise<any> {
  try {
    // Use the server-side client
    const user = await getClient().v2.userByUsername(username, {
      'user.fields': ['id', 'name', 'username', 'profile_image_url'],
    });
    
    if (!user.data) {
      return null;
    }
    return user.data;
  } catch (error) {
    console.error('Twitter API error:', error);
    throw new TwitterClientError(error);
  }
}

export async function startUserStream(userId: string, onTweet: (tweet: Tweet) => void): Promise<any> {
  try {
    const stream = await getClient().v2.searchStream({
      'tweet.fields': ['author_id', 'created_at'],
      expansions: ['author_id'],
    });

    stream.on('data', (tweet) => {
      if (tweet.data.author_id === userId) {
        onTweet({
          id: tweet.data.id,
          text: tweet.data.text,
          author_id: tweet.data.author_id,
          created_at: tweet.data.created_at,
        });
      }
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      throw new TwitterClientError(error);
    });

    return stream;
  } catch (error) {
    console.error('Error starting stream:', error);
    throw new TwitterClientError(error);
  }
}

// Helper function to validate webhook requests
export function validateWebhookRequest(
  signature: string,
  body: string,
  timestamp: string
): boolean {
  if (!process.env.TWITTER_CONSUMER_SECRET) {
    throw new Error('TWITTER_CONSUMER_SECRET environment variable is required');
  }

  const hmac = createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET);
  hmac.update(`${timestamp}${body}`);
  const expectedSignature = `sha256=${hmac.digest('base64')}`;
  return signature === expectedSignature;
}

// Add a simple in-memory cache for tweets
const tweetCache = new Map<string, any>();

export async function getTweetById(tweetId: string): Promise<any> {
  // Check cache first
  if (tweetCache.has(tweetId)) {
    console.log(`Using cached tweet data for ID: ${tweetId}`);
    return tweetCache.get(tweetId);
  }
  
  try {
    // Use the app-only client for reading tweets
    const tweet = await appOnlyClient.v2.singleTweet(tweetId, {
      expansions: ['author_id'],
      'tweet.fields': ['created_at', 'text'],
      'user.fields': ['name', 'username'],
    });
    
    if (!tweet.data) {
      throw new Error('Tweet not found');
    }
    
    // Cache the result
    tweetCache.set(tweetId, tweet.data);
    
    return tweet.data;
  } catch (error: any) {
    console.error('Error fetching tweet:', error);
    
    // Handle rate limiting
    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset ? new Date(error.rateLimit.reset * 1000) : null;
      const resetMessage = resetTime ? ` Try again after ${resetTime.toLocaleTimeString()}.` : '';
      
      throw new TwitterClientError({
        code: 429,
        message: `Twitter API rate limit exceeded.${resetMessage} Please try again later.`
      });
    }
    
    // Handle authentication issues
    if (error.code === 401) {
      throw new TwitterClientError({
        code: 401,
        message: 'Twitter API authentication failed. Please check your API credentials.'
      });
    }
    
    throw new TwitterClientError(error);
  }
}

// Track rate limits for different endpoints
const rateLimits: Record<string, { limited: boolean, resetTime: number }> = {
  'user_timeline': { limited: false, resetTime: 0 },
  'tweet_lookup': { limited: false, resetTime: 0 },
  'user_lookup': { limited: false, resetTime: 0 },
};

function isRateLimited(endpoint: string): boolean {
  const now = Date.now() / 1000; // Current time in seconds
  if (rateLimits[endpoint]?.limited && now < rateLimits[endpoint].resetTime) {
    return true;
  }
  // Reset if the time has passed
  if (rateLimits[endpoint]?.limited) {
    rateLimits[endpoint].limited = false;
  }
  return false;
}

function setRateLimited(endpoint: string, resetTimeSeconds?: number) {
  const now = Date.now() / 1000;
  // Default to 15 minutes if no reset time provided
  const resetTime = resetTimeSeconds || now + 15 * 60;
  rateLimits[endpoint] = { limited: true, resetTime };
}

// Add a function to get a user's recent tweets
export async function getUserTweets(username: string, count = 10): Promise<any> {
  try {
    // Check in-memory cache first
    const cacheKey = `user_tweets:${username}`;
    if (tweetCache.has(cacheKey)) {
      console.log(`Using in-memory cached tweets for user: ${username}`);
      return tweetCache.get(cacheKey);
    }
    
    // Check Supabase cache
    const cachedTweets = await getCachedUserTweets(username);
    if (cachedTweets) {
      // Update in-memory cache
      tweetCache.set(cacheKey, cachedTweets);
      return cachedTweets;
    }
    
    // If we get here, we need to make an API call
    // But first check if we're already rate limited
    if (isRateLimited('user_timeline')) {
      console.log('Currently rate limited for user timeline requests');
      // Return empty array or mock data instead of failing
      return [];
    }
    
    // Get the user ID first
    const user = await getUserByUsername(username);
    if (!user) {
      throw new Error(`User ${username} not found`);
    }
    
    // Get recent tweets
    const tweets = await appOnlyClient.v2.userTimeline(user.id, {
      max_results: count,
      'tweet.fields': ['created_at', 'public_metrics', 'text'],
      exclude: ['retweets', 'replies'],
    });
    
    // Cache the result
    const tweetData = tweets.data.data || [];
    tweetCache.set(cacheKey, tweetData);
    
    // Store in Supabase for longer-term caching
    await storeUserTweets(username, tweetData);
    
    return tweetData;
  } catch (error: any) {
    console.error(`Error fetching tweets for user ${username}:`, error);
    
    if (error.code === 429) {
      // Update rate limit tracking
      setRateLimited('user_timeline', error.rateLimit?.reset);
      
      // Try to return cached data even if it's stale
      const staleCachedTweets = await getCachedUserTweets(username, true);
      if (staleCachedTweets) {
        console.log('Using stale cached tweets due to rate limiting');
        return staleCachedTweets;
      }
      
      // If no cache at all, return empty array instead of failing
      return [];
    }
    
    // For other errors, throw normally
    throw new TwitterClientError(error);
  }
}

// Generate realistic mock tweets for a user
function generateMockTweetsForUser(username: string, count = 10): any[] {
  const mockTopics = [
    'tech', 'AI', 'programming', 'web development', 
    'startups', 'product design', 'UX', 'innovation'
  ];
  
  return Array(count).fill(0).map((_, i) => ({
    id: `mock_${Date.now()}_${i}`,
    text: `Just thinking about ${mockTopics[Math.floor(Math.random() * mockTopics.length)]} and how it's changing everything. What do you all think? #${username.replace('@', '')}thoughts`,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    public_metrics: {
      like_count: Math.floor(Math.random() * 100),
      retweet_count: Math.floor(Math.random() * 20),
      reply_count: Math.floor(Math.random() * 10)
    }
  }));
}

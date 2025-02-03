import { TwitterApi } from 'twitter-api-v2';
import { createHmac } from 'crypto';

// Initialize the Twitter client with OAuth 2.0 credentials and bearer token
const twitter = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
});

// Create a client with bearer token for app-only operations
if (!process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN) {
  throw new Error('NEXT_PUBLIC_TWITTER_BEARER_TOKEN is required');
}

const client = new TwitterApi(process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN!).readWrite;

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

export async function postTweet(text: string, reply_to?: string) {
  try {
    const tweet = await client.v2.tweet(text, {
      reply: reply_to ? { in_reply_to_tweet_id: reply_to } : undefined,
    });
    return tweet.data;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw new TwitterClientError(error);
  }
}

export async function setupWebhook(webhookUrl: string) {
  try {
    // Register webhook URL with Twitter
    const webhook = await client.v2.createWebhook({
      url: webhookUrl,
      enabled: true,
    });

    // Subscribe to tweet events
    await client.v2.subscribeToWebhook(webhook.id, {
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

export async function getUserByUsername(username: string) {
  try {
    const client = new TwitterApi(process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN!);
    const user = await client.v2.userByUsername(username);
    
    if (!user.data) {
      return null;
    }

    return user.data;
  } catch (error) {
    console.error('Twitter API error:', error);
    throw new TwitterClientError(error);
  }
}

export async function startUserStream(userId: string, onTweet: (tweet: Tweet) => void) {
  try {
    const stream = await client.v2.searchStream({
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

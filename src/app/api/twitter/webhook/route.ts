/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDraftReply } from '@/app/lib/anthropic';
import { getUserPreferences, saveDraftTweet } from '@/app/lib/db';
import { createHmac } from 'crypto';
import { notifyUser } from '@/app/lib/socket';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Twitter sends a CRC token to validate the webhook
export async function GET(request: NextRequest) {
  const crcToken = request.nextUrl.searchParams.get('crc_token');
  
  if (!crcToken) {
    return new Response('No CRC token provided', { status: 400 });
  }

  const hmac = createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET!);
  hmac.update(crcToken);
  const responseToken = `sha256=${hmac.digest('base64')}`;

  return new Response(JSON.stringify({ response_token: responseToken }), {
    headers: { 'content-type': 'application/json' },
  });
}

// Handle incoming tweet events
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Verify the request is from Twitter using the signature
    const signature = request.headers.get('x-twitter-webhooks-signature');
    if (!verifyTwitterSignature(signature, await request.text())) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Handle tweet_create_events
    if (payload.tweet_create_events) {
      await handleNewTweet(payload.tweet_create_events[0]);
    }

    return new Response('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleNewTweet(tweet: any) {
  // Get all users monitoring this tweet's author
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('user_id, style_accounts, custom_instructions')
    .contains('monitored_accounts', [tweet.user.screen_name]);

  if (!preferences?.length) return;

  // Generate drafts for each user monitoring this tweet
  await Promise.all(
    preferences.map(async (prefs) => {
      try {
        const draftText = await generateDraftReply({
          originalTweet: tweet.text,
          styleAccounts: prefs.style_accounts,
          customInstructions: prefs.custom_instructions,
        });

        await saveDraftTweet({
          user_id: prefs.user_id,
          original_tweet_id: tweet.id_str,
          original_tweet_text: tweet.text,
          draft_text: draftText,
          status: 'pending',
        });

        // Notify connected clients about new draft
        await notifyUser(prefs.user_id, 'new_draft');
      } catch (error) {
        console.error('Error generating draft:', error);
      }
    })
  );
}

function verifyTwitterSignature(signature: string | null, body: string): boolean {
  if (!signature) return false;

  const hmac = createHmac('sha256', process.env.TWITTER_CONSUMER_SECRET!);
  hmac.update(body);
  const expectedSignature = `sha256=${hmac.digest('base64')}`;

  return signature === expectedSignature;
}

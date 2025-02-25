import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { generateDraftReply } from '@/app/lib/anthropic';
import { getTweetById, getUserTweets } from '@/app/lib/twitter';
import { v4 as uuidv4 } from 'uuid';
import { TwitterClientError } from '@/app/lib/twitter';

// Mock tweet data for development
const MOCK_MODE = process.env.MOCK_TWITTER_API !== 'false'; // Default to true unless explicitly set to false
const mockTweet = {
  id: '1234567890',
  text: 'This is a mock tweet for testing purposes. The Twitter API has strict rate limits, so we use this for development.',
  author_id: '12345',
  created_at: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tweetId, styleAccount, useMock = false } = await request.json();
    
    // Override the global mock mode with the request parameter
    const shouldUseMock = useMock || (process.env.MOCK_TWITTER_API !== 'false' && process.env.FORCE_REAL_API !== 'true');
    
    if (!tweetId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the original tweet content
    let tweet;
    if (shouldUseMock) {
      console.log('Using mock tweet data');
      tweet = mockTweet;
    } else {
      console.log('Fetching real tweet data');
      tweet = await getTweetById(tweetId);
    }
    
    if (!tweet) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Generate multiple draft replies
    const styleAccounts = styleAccount ? [styleAccount] : [];
    const numDrafts = 3; // Generate 3 draft replies
    
    // Get style examples if a style account is specified
    let styleExamples = '';
    if (styleAccount && !shouldUseMock) {
      try {
        const userTweets = await getUserTweets(styleAccount, 20);
        
        // Sort by engagement (likes + retweets)
        const sortedTweets = [...userTweets].sort((a, b) => {
          const engagementA = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0);
          const engagementB = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0);
          return engagementB - engagementA;
        });
        
        // Take top 5 tweets as examples
        const topTweets = sortedTweets.slice(0, 5);
        styleExamples = topTweets.map(t => t.text).join('\n\n');
        
        console.log(`Using ${topTweets.length} tweets from ${styleAccount} as style examples`);
      } catch (error) {
        console.error(`Error getting style examples for ${styleAccount}:`, error);
        // Continue without style examples if there's an error
      }
    }

    // Set environment variable for mock mode - IMPORTANT: set to false to use real API
    if (shouldUseMock) {
      process.env.MOCK_ANTHROPIC_API = 'true';
    } else {
      process.env.MOCK_ANTHROPIC_API = 'false';
    }

    const draftPromises = Array(numDrafts).fill(0).map(() => 
      generateDraftReply({
        originalTweet: tweet.text,
        styleAccounts,
        styleExamples,
        customInstructions: '',
      })
    );
    
    const draftTexts = await Promise.all(draftPromises);
    
    // Format the drafts with IDs and ensure we have text
    const drafts = draftTexts.map(text => ({
      id: uuidv4(),
      text: text || "Failed to generate a reply. Please try again.",
    }));
    
    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('Error generating drafts:', error);
    
    // Pass through specific error messages
    if (error instanceof TwitterClientError) {
      return NextResponse.json(
        { error: error.error.message || 'Twitter API error' },
        { status: error.error.code || 500 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate draft replies' },
      { status: 500 }
    );
  }
} 
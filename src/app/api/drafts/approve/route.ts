import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { postTweet, TwitterClientError } from '@/app/lib/twitter';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { draftId, draftText, originalTweetId } = await request.json();
    
    if (!draftText) {
      return NextResponse.json(
        { error: 'Missing draft text' },
        { status: 400 }
      );
    }
    
    // Post the tweet
    try {
      const tweet = await postTweet(draftText, originalTweetId);
      
      return NextResponse.json({ 
        success: true,
        tweet: tweet
      });
    } catch (twitterError: any) {
      // Handle Twitter API errors specifically
      if (twitterError instanceof TwitterClientError) {
        const statusCode = twitterError.error.code || 500;
        let errorMessage = 'Failed to post tweet to Twitter.';
        
        // Provide more helpful messages for common errors
        if (statusCode === 401) {
          errorMessage = 'Twitter authentication failed. Please check your API credentials or reconnect your Twitter account.';
        } else if (statusCode === 403) {
          errorMessage = 'Your app doesn\'t have permission to post tweets. Check your Twitter developer app settings.';
        } else if (twitterError.error.data?.detail) {
          errorMessage = `Twitter error: ${twitterError.error.data.detail}`;
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: statusCode }
        );
      }
      
      // Re-throw other errors to be caught by the outer catch block
      throw twitterError;
    }
  } catch (error: any) {
    console.error('Error approving draft:', error);
    
    return NextResponse.json(
      { error: `Error approving draft: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

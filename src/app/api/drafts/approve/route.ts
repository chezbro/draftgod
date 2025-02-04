import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { postTweet } from '@/app/lib/twitter';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { draftText, originalTweetId } = await request.json();
    
    if (!draftText || !originalTweetId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await postTweet(draftText, originalTweetId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving draft:', error);
    return NextResponse.json(
      { error: 'Failed to post tweet' },
      { status: 500 }
    );
  }
}

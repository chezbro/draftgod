import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/app/lib/twitter';
import { TwitterClientError } from '@/app/lib/twitter';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: 'Twitter user not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error looking up Twitter user:', error);
    if (error instanceof TwitterClientError) {
      return NextResponse.json(
        { error: error.error.message || 'Twitter API error' },
        { status: error.error.code || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to lookup Twitter user' },
      { status: 500 }
    );
  }
} 
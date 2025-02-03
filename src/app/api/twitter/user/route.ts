import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/app/lib/twitter';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const user = await getUserByUsername(username);
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching Twitter user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Twitter user' },
      { status: 500 }
    );
  }
} 
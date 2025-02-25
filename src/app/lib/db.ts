import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export interface DraftTweet {
  id: string;
  user_id: string;
  original_tweet_id: string;
  original_tweet_text: string;
  draft_text: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  monitored_accounts: string[];
  style_accounts: string[];
  custom_instructions: string;
  created_at: string;
  updated_at: string;
}

export async function getDraftTweets(userId: string): Promise<DraftTweet[]> {
  const { data, error } = await supabase
    .from('draft_tweets')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  if (!userId) {
    throw new Error('userId is required');
  }

  // First try to get existing preferences
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If no preferences exist, create default ones
  if (error && (error.code === 'PGRST116' || error.message === 'No rows returned')) {
    console.log('Creating default preferences for user:', userId);
    
    const defaultPreferences: Partial<UserPreferences> = {
      user_id: userId,
      monitored_accounts: [],
      style_accounts: [],
      custom_instructions: '',
    };
    
    const { data: newData, error: insertError } = await supabase
      .from('user_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating default preferences:', insertError);
      throw insertError;
    }

    return newData;
  }

  if (error) {
    console.error('Unexpected Supabase error:', error);
    throw error;
  }
  
  return data;
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      monitored_accounts: preferences.monitored_accounts || [],
      style_accounts: preferences.style_accounts || [],
      custom_instructions: preferences.custom_instructions || '',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
}

export async function saveDraftTweet(draft: Omit<DraftTweet, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const { error } = await supabase
    .from('draft_tweets')
    .insert({
      ...draft,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

// Store user tweets in Supabase
export async function storeUserTweets(username: string, tweets: any[]) {
  try {
    // First, check if we already have recent tweets for this user
    const { data: existingData } = await supabase
      .from('cached_user_tweets')
      .select('*')
      .eq('username', username)
      .single();
    
    const now = new Date();
    
    if (existingData) {
      // Check if the cache is still fresh (less than 24 hours old)
      const lastUpdated = new Date(existingData.updated_at);
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log(`Using cached tweets for ${username}, last updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        return existingData.tweets;
      }
      
      // Update the existing record
      const { data } = await supabase
        .from('cached_user_tweets')
        .update({
          tweets: tweets,
          updated_at: now.toISOString()
        })
        .eq('username', username)
        .select();
      
      return data?.[0]?.tweets || tweets;
    } else {
      // Insert a new record
      const { data } = await supabase
        .from('cached_user_tweets')
        .insert({
          username: username,
          tweets: tweets,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select();
      
      return data?.[0]?.tweets || tweets;
    }
  } catch (error) {
    console.error('Error storing user tweets in Supabase:', error);
    // Return the original tweets if we couldn't cache them
    return tweets;
  }
}

// Get cached user tweets from Supabase, with option to accept stale data
export async function getCachedUserTweets(username: string, acceptStale = false) {
  try {
    const { data } = await supabase
      .from('cached_user_tweets')
      .select('*')
      .eq('username', username)
      .single();
    
    if (data) {
      const lastUpdated = new Date(data.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      // Check if the cache is still fresh (less than 24 hours old) or we accept stale data
      if (hoursSinceUpdate < 24 || acceptStale) {
        const freshness = acceptStale && hoursSinceUpdate >= 24 ? 'stale' : 'fresh';
        console.log(`Using ${freshness} cached tweets for ${username}, last updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        return data.tweets;
      }
    }
    
    return null; // Cache miss or stale cache that we don't want to use
  } catch (error) {
    console.error('Error getting cached user tweets from Supabase:', error);
    return null;
  }
}

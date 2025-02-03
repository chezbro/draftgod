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

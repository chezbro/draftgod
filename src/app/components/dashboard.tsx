'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DraftTweet, getDraftTweets } from '@/app/lib/db';
import { postTweet } from '@/app/lib/twitter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Dashboard({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<DraftTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<DraftTweet | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const draftTweets = await getDraftTweets(userId);
      setDrafts(draftTweets);
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  async function handleApprove(draft: DraftTweet) {
    try {
      await postTweet(draft.draft_text, draft.original_tweet_id);
      // Update draft status in database
      // Refresh drafts
      await loadDrafts();
    } catch (error) {
      console.error('Error approving draft:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-foreground/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Draft Replies</h1>
        <button 
          onClick={() => loadDrafts()}
          className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <div className="grid gap-4">
        {drafts.map((draft) => (
          <div 
            key={draft.id}
            className="p-6 rounded-xl border border-foreground/10 bg-background hover:border-foreground/20 transition-colors"
          >
            <div className="space-y-4">
              <div className="text-sm text-foreground/60">
                Replying to: {draft.original_tweet_text}
              </div>
              
              <p className="text-lg">{draft.draft_text}</p>

              <div className="flex gap-2 justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 hover:bg-green-500/10 rounded-full text-green-500 transition-colors">
                      <Check className="w-5 h-5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve and Post Reply?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will post the reply to Twitter immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleApprove(draft)}
                      >
                        Approve & Post
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <button className="p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {drafts.length === 0 && (
          <div className="text-center py-12 text-foreground/60">
            No draft replies yet. They'll appear here when your monitored accounts tweet.
          </div>
        )}
      </div>
    </div>
  );
}

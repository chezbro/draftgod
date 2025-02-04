/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { DraftTweet, getDraftTweets } from '@/app/lib/db';
import { postTweet, TwitterClientError } from '@/app/lib/twitter';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '../error-boundary';

export default function Dashboard({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<DraftTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [userId]);

  useEffect(() => {
    const socket = io({
      path: '/api/socket',
    });

    socket.on('connect', () => {
      console.log('Connected to websocket');
    });

    socket.on('new_draft', () => {
      loadDrafts();
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  async function handleApprove(draft: DraftTweet) {
    try {
      await postTweet(draft.draft_text, draft.original_tweet_id);
      toast.success('Tweet posted successfully!');
      await loadDrafts();
    } catch (error) {
      if (error instanceof TwitterClientError) {
        toast.error(`Failed to post tweet: ${error.error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  }

  async function loadDrafts() {
    try {
      setLoading(true);
      const draftTweets = await getDraftTweets(userId);
      setDrafts(draftTweets);
    } catch (error) {
      toast.error('Failed to load drafts');
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  }

  // ... rest of the component code ...

  return (
    <ErrorBoundary>
      {/* ... existing JSX ... */}
    </ErrorBoundary>
  );
} 
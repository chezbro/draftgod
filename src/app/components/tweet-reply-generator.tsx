'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface DraftReply {
  id: string;
  text: string;
}

export default function TweetReplyGenerator() {
  const [tweetUrl, setTweetUrl] = useState('');
  const [styleAccount, setStyleAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftReply[]>([]);
  const [useRealApi, setUseRealApi] = useState(false);
  const [currentTweetId, setCurrentTweetId] = useState<string | null>(null);

  async function extractTweetId(url: string): Promise<string | null> {
    // Clean the URL first (remove any @ or other characters at the beginning)
    const cleanedUrl = url.trim().replace(/^[@\s]+/, '');
    
    // Handle both twitter.com and x.com domains
    const regex = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
    const match = cleanedUrl.match(regex);
    return match ? match[1] : null;
  }

  async function handleGenerateDrafts(e: React.FormEvent) {
    e.preventDefault();
    
    if (!tweetUrl.trim()) {
      toast.error('Please enter a tweet URL');
      return;
    }
    
    setLoading(true);
    
    try {
      const tweetId = await extractTweetId(tweetUrl);
      
      if (!tweetId) {
        toast.error('Invalid tweet URL format');
        return;
      }
      
      // Store the current tweet ID for regeneration
      setCurrentTweetId(tweetId);
      
      const response = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId,
          styleAccount: styleAccount.replace('@', '').trim(),
          useMock: !useRealApi,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate drafts');
      }
      
      const data = await response.json();
      setDrafts(data.drafts);
      toast.success('Draft reply generated successfully!');
    } catch (error) {
      console.error('Error generating drafts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate drafts');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateDraft() {
    if (!currentTweetId) {
      toast.error('No tweet selected for regeneration');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId: currentTweetId,
          styleAccount: styleAccount.replace('@', '').trim(),
          useMock: !useRealApi,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate draft');
      }
      
      const data = await response.json();
      setDrafts(data.drafts);
      toast.success('Draft reply regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate draft');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveDraft(draft: DraftReply) {
    try {
      const tweetId = await extractTweetId(tweetUrl);
      
      if (!tweetId) {
        toast.error('Invalid tweet URL');
        return;
      }
      
      const response = await fetch('/api/drafts/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftText: draft.text,
          originalTweetId: tweetId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post tweet');
      }
      
      toast.success('Tweet posted successfully!');
      // Remove the approved draft from the list
      setDrafts(drafts.filter(d => d.id !== draft.id));
    } catch (error) {
      console.error('Error approving draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to post tweet');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Generate Tweet Replies</h2>
      
      <form onSubmit={handleGenerateDrafts} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="tweet-url" className="block text-sm font-medium">
            Tweet URL
          </label>
          <input
            id="tweet-url"
            type="text"
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            placeholder="https://twitter.com/username/status/123456789"
            className="w-full px-3 py-2 border rounded-md bg-background"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="style-account" className="block text-sm font-medium">
            Mimic Style of Account (optional)
          </label>
          <input
            id="style-account"
            type="text"
            value={styleAccount}
            onChange={(e) => setStyleAccount(e.target.value)}
            placeholder="@username"
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input
            id="use-real-api"
            type="checkbox"
            checked={useRealApi}
            onChange={(e) => setUseRealApi(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="use-real-api" className="text-sm">
            Use real API (may hit rate limits)
          </label>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Draft Reply'
          )}
        </button>
      </form>
      
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Draft Reply</h3>
            <button
              onClick={handleRegenerateDraft}
              disabled={loading || !currentTweetId}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-foreground/10 rounded-md hover:bg-foreground/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-4 border rounded-md bg-background/50">
                {draft.text ? (
                  <>
                    <p className="mb-4 whitespace-pre-wrap">{draft.text}</p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleApproveDraft(draft)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Approve & Post
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-red-500">Error: Empty draft content</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
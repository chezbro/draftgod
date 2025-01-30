'use client';

import { useState, useEffect } from 'react';
import { UserPreferences, getUserPreferences, updateUserPreferences } from '@/app/lib/db';
import { getUserByUsername } from '@/app/lib/twitter';
import { Plus, X, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '../error-boundary';
import { TwitterClientError } from '@/app/lib/twitter';

export default function Settings({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMonitoredAccount, setNewMonitoredAccount] = useState('');
  const [newStyleAccount, setNewStyleAccount] = useState('');

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  async function loadPreferences() {
    try {
      const prefs = await getUserPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      toast.error('Failed to load preferences');
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMonitoredAccount(e: React.FormEvent) {
    e.preventDefault();
    console.log('Adding account:', newMonitoredAccount);
    if (!newMonitoredAccount || !preferences) {
      console.log('Missing data:', { newMonitoredAccount, preferences });
      return;
    }

    try {
      const username = newMonitoredAccount.replace('@', '');
      console.log('Fetching user:', username);
      
      if (preferences.monitored_accounts.includes(username)) {
        toast.error('This account is already being monitored');
        return;
      }

      const user = await getUserByUsername(username);
      console.log('User data:', user);
      
      if (!user) {
        toast.error('Twitter account not found');
        return;
      }

      const updatedAccounts = [...preferences.monitored_accounts, username];
      console.log('Updating preferences with:', updatedAccounts);
      
      await updateUserPreferences(userId, {
        ...preferences,
        monitored_accounts: updatedAccounts,
      });
      
      toast.success('Account added to monitoring list');
      await loadPreferences();
      setNewMonitoredAccount('');
    } catch (error) {
      console.error('Detailed error:', error);
      if (error instanceof TwitterClientError) {
        toast.error(`Failed to add account: ${error.error.message}`);
      } else {
        toast.error('Failed to add account. Please try again.');
        console.error('Error adding monitored account:', error);
      }
    }
  }

  async function handleRemoveMonitoredAccount(account: string) {
    if (!preferences) return;

    try {
      const updatedAccounts = preferences.monitored_accounts.filter(
        (a) => a !== account
      );
      await updateUserPreferences(userId, {
        ...preferences,
        monitored_accounts: updatedAccounts,
      });
      toast.success('Account removed from monitoring list');
      await loadPreferences();
    } catch (error) {
      toast.error('Failed to remove account');
      console.error('Error removing account:', error);
    }
  }

  async function handleSaveInstructions() {
    if (!preferences) return;
    
    setSaving(true);
    try {
      await updateUserPreferences(userId, preferences);
      toast.success('Settings saved successfully');
      await loadPreferences();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!preferences) {
    return <div>Error loading preferences</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Monitored Accounts</h2>
        <p className="text-sm text-foreground/60">
          Add Twitter accounts you want to monitor for new tweets
        </p>

        <form onSubmit={handleAddMonitoredAccount} className="flex gap-2">
          <input
            type="text"
            value={newMonitoredAccount}
            onChange={(e) => setNewMonitoredAccount(e.target.value)}
            placeholder="Twitter username"
            className="flex-1 px-3 py-2 border rounded-md bg-background"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        <div className="space-y-2">
          {preferences.monitored_accounts.map((account) => (
            <div
              key={account}
              className="flex items-center justify-between px-3 py-2 border rounded-md"
            >
              <span>@{account}</span>
              <button
                onClick={() => handleRemoveMonitoredAccount(account)}
                className="text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Custom Instructions</h2>
        <p className="text-sm text-foreground/60">
          Add any specific instructions for generating replies
        </p>

        <textarea
          value={preferences.custom_instructions}
          onChange={(e) =>
            setPreferences({
              ...preferences,
              custom_instructions: e.target.value,
            })
          }
          rows={4}
          className="w-full px-3 py-2 border rounded-md bg-background"
          placeholder="E.g., Keep responses professional and friendly..."
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSaveInstructions}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
} 
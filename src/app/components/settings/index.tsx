'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  const [monitoredAccounts, setMonitoredAccounts] = useState<string[]>([]);
  const [styleAccounts, setStyleAccounts] = useState<string[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const prefs = await getUserPreferences(userId);
      if (prefs) {
        setMonitoredAccounts(prefs.monitored_accounts || []);
        setStyleAccounts(prefs.style_accounts || []);
        setCustomInstructions(prefs.custom_instructions || '');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    console.log('Settings component mounted with userId:', userId);
    if (!userId) {
      console.error('No userId provided to Settings component');
      return;
    }
    loadPreferences();
  }, [loadPreferences, userId]);

  async function handleAddMonitoredAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newMonitoredAccount || !preferences) return;

    try {
      const username = newMonitoredAccount.replace('@', '').trim();
      
      if (!username) {
        toast.error('Please enter a valid username');
        return;
      }
      
      if (preferences.monitored_accounts.includes(username)) {
        toast.error('This account is already being monitored');
        return;
      }

      const response = await fetch(`/api/twitter/lookup?username=${username}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lookup Twitter user');
      }
      
      const user = await response.json();
      if (!user) {
        toast.error('Twitter account not found');
        return;
      }

      const updatedAccounts = [...(preferences.monitored_accounts || []), username];
      await updateUserPreferences(userId, {
        ...preferences,
        monitored_accounts: updatedAccounts,
      });
      
      toast.success('Account added successfully');
      await loadPreferences();
      setNewMonitoredAccount('');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add account. Please try again.');
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
      console.error('Error saving preferences:', error);
      toast.error('Failed to save settings');
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
            id="monitored-account"
            name="monitored-account"
            type="text"
            value={newMonitoredAccount}
            onChange={(e) => setNewMonitoredAccount(e.target.value)}
            placeholder="Twitter username"
            className="flex-1 px-3 py-2 border rounded-md bg-background"
            required
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
          id="custom-instructions"
          name="custom-instructions"
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
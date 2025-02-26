'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UserPreferences, getUserPreferences, updateUserPreferences } from '@/app/lib/db';
import { getUserByUsername, TwitterClientError } from '@/app/lib/twitter';
import { Plus, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [newMonitoredAccount, setNewMonitoredAccount] = useState('');
  const [newStyleAccount, setNewStyleAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      console.log('Loading preferences for userId:', userId);
      const response = await fetch('/api/preferences');
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  async function handleAddMonitoredAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newMonitoredAccount || !preferences) return;

    try {
      const username = newMonitoredAccount.replace('@', '').trim();
      
      if (!username) {
        toast.error('Please enter a valid username');
        return;
      }
      
      console.log('Current monitored accounts:', preferences.monitored_accounts);
      if (preferences.monitored_accounts.includes(username)) {
        toast.error('This account is already being monitored');
        return;
      }

      const user = await getUserByUsername(username);
      if (!user) {
        toast.error('Twitter account not found');
        return;
      }

      const updatedAccounts = [...(preferences.monitored_accounts || []), username];
      console.log('Updating with new accounts:', updatedAccounts);
      
      await updateUserPreferences(userId, {
        ...preferences,
        monitored_accounts: updatedAccounts,
      });
      
      toast.success('Account added successfully');
      await loadPreferences();
      setNewMonitoredAccount('');
    } catch (error) {
      console.error('Error adding account:', error);
      if (error instanceof TwitterClientError) {
        toast.error(`Twitter API error: ${error.error.message}`);
      } else {
        toast.error('Failed to add account. Please try again.');
      }
    }
  }

  async function handleAddStyleAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newStyleAccount || !preferences) return;

    try {
      const user = await getUserByUsername(newStyleAccount);
      if (!user) throw new Error('User not found');

      const updatedAccounts = [...preferences.style_accounts, newStyleAccount];
      await updateUserPreferences(userId, {
        ...preferences,
        style_accounts: updatedAccounts,
      });
      
      await loadPreferences();
      setNewStyleAccount('');
    } catch (error) {
      console.error('Error adding style account:', error);
    }
  }

  async function handleSave() {
    if (!preferences) return;
    
    setSaving(true);
    try {
      await updateUserPreferences(userId, preferences);
      await loadPreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
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
            className="flex-1 px-4 py-2 rounded-lg border border-foreground/10 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {preferences?.monitored_accounts?.map((account) => (
            <div
              key={account}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5"
            >
              <span>@{account}</span>
              <button
                onClick={() => {
                  if (!preferences) return;
                  setPreferences({
                    ...preferences,
                    monitored_accounts: preferences.monitored_accounts.filter(
                      (a) => a !== account
                    ),
                  });
                }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!preferences?.monitored_accounts || preferences.monitored_accounts.length === 0) && (
            <div className="text-foreground/60 text-sm">
              No accounts being monitored yet
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Style Accounts</h2>
        <p className="text-sm text-foreground/60">
          Add Twitter accounts whose style you want to mimic
        </p>

        <form onSubmit={handleAddStyleAccount} className="flex gap-2">
          <input
            type="text"
            value={newStyleAccount}
            onChange={(e) => setNewStyleAccount(e.target.value)}
            placeholder="@username"
            className="flex-1 px-4 py-2 rounded-lg border border-foreground/10 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {preferences?.style_accounts.map((account) => (
            <div
              key={account}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5"
            >
              <span>{account}</span>
              <button
                onClick={() => {
                  if (!preferences) return;
                  setPreferences({
                    ...preferences,
                    style_accounts: preferences.style_accounts.filter(
                      (a) => a !== account
                    ),
                  });
                }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Custom Instructions</h2>
        <textarea
          value={preferences?.custom_instructions || ''}
          onChange={(e) => {
            if (!preferences) return;
            setPreferences({
              ...preferences,
              custom_instructions: e.target.value,
            });
          }}
          placeholder="Add any custom instructions for generating replies..."
          className="w-full px-4 py-2 rounded-lg border border-foreground/10 bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 min-h-[100px]"
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

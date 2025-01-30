'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Home, Settings as SettingsIcon, LogOut } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="border-b border-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link 
              href="/dashboard"
              className="text-xl font-bold"
            >
              DraftGod
            </Link>

            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-foreground/5'
                    : 'hover:bg-foreground/5'
                }`}
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  pathname === '/settings'
                    ? 'bg-foreground/5'
                    : 'hover:bg-foreground/5'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </Link>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-foreground/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
} 
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  RotateCcw,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { ActiveTab, UserPublic } from '../types/social';
import { Avatar } from './Avatar';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenOwnProfile: () => void;
  currentUser: UserPublic;
  unreadNotifications: number;
  unreadMessages: number;
  bookmarksCount: number;
  isPrototypeMode: boolean;
  onResetPrototype?: () => void;
  onLogout: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenOwnProfile,
  currentUser,
  unreadNotifications,
  unreadMessages,
  bookmarksCount,
  isPrototypeMode,
  onResetPrototype,
  onLogout,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: typeof Home;
    badge?: number;
    onClick: () => void;
  }[] = [
    {
      id: 'feed',
      label: 'Home',
      icon: Home,
      onClick: () => onSelectTab('feed'),
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: Compass,
      onClick: () => onSelectTab('discover'),
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      badge: bookmarksCount > 0 ? bookmarksCount : undefined,
      onClick: () => onSelectTab('bookmarks'),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications,
      onClick: () => onSelectTab('notifications'),
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessages,
      onClick: () => onSelectTab('messages'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: onOpenOwnProfile,
    },
  ];

  return (
    <>
      {/* Desktop Left Navigation Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-60 lg:w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 h-screen px-4 py-6">
        <div>
          <div className="flex items-center justify-between px-3 mb-8">
            <button
              type="button"
              onClick={() => onSelectTab('feed')}
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 rounded-lg"
            >
              <span className="text-xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                ConnectSphere
              </span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <nav aria-label="Primary Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`font-mono-num text-xs font-semibold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                          : 'bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-100'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Workspace Controls & Account Card */}
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {isPrototypeMode && (
            <div className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
              <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
                Interactive Prototype session
              </p>
              <div className="flex items-center gap-2">
                {onResetPrototype && (
                  <button
                    type="button"
                    onClick={onResetPrototype}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset data</span>
                  </button>
                )}
                <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700 text-xs">
                  &middot;
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  Live sign in
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-2 py-1">
            <button
              type="button"
              onClick={onOpenOwnProfile}
              className="flex items-center gap-3 min-w-0 flex-1 text-left group"
            >
              <Avatar src={currentUser.avatarUrl} name={currentUser.fullName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                  {currentUser.fullName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  @{currentUser.username}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title={isPrototypeMode ? 'Exit prototype' : 'Sign out'}
              aria-label={isPrototypeMode ? 'Exit prototype' : 'Sign out'}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around h-14 px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center min-w-[44px] h-11 rounded-lg transition-colors ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && item.id !== 'bookmarks' && (
                <span className="absolute top-1 right-1.5 font-mono-num text-[10px] font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded px-1 leading-tight">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

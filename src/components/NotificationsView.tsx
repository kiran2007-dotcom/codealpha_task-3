import { Bell, Check, Heart, MessageCircle, MessageSquare, UserPlus } from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatRelativeTime } from '../lib/validation';
import type { NotificationItem, NotificationType } from '../types/social';
import { Avatar } from './Avatar';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onOpenProfile: (uid: string) => void;
  onOpenPostById: (postId: string) => void;
  onOpenMessagesWithUser: (uid: string) => void;
}

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case 'like':
      return <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />;
    case 'follow':
      return <UserPlus className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />;
    case 'message':
      return <MessageSquare className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />;
  }
}

export function NotificationsView({
  notifications,
  onOpenProfile,
  onOpenPostById,
  onOpenMessagesWithUser,
}: NotificationsViewProps) {
  const actions = useSocialActions();
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  const handleClick = async (item: NotificationItem) => {
    if (!item.read) {
      await actions.markNotificationRead(item.id);
    }
    if (item.type === 'follow') {
      onOpenProfile(item.actorId);
    } else if (item.type === 'message') {
      onOpenMessagesWithUser(item.actorId);
    } else if (item.postId) {
      onOpenPostById(item.postId);
    }
  };

  return (
    <div>
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Activity</span>
          <span aria-hidden="true" className="text-xs text-zinc-300 dark:text-zinc-700">
            &middot;
          </span>
          <span className="font-mono-num text-xs text-zinc-500 dark:text-zinc-400">
            {unreadIds.length} unread
          </span>
        </div>

        {unreadIds.length > 0 && (
          <button
            type="button"
            onClick={() => void actions.markAllNotificationsRead(unreadIds)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center">
          <Bell className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No notifications yet
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            When someone follows you, likes your post, comments, or sends a message, it appears
            here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void handleClick(item)}
              className={`w-full text-left px-5 py-4 flex items-start gap-3.5 transition-colors ${
                item.read
                  ? 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  : 'bg-zinc-50 dark:bg-zinc-900/70 hover:bg-zinc-100/70 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="mt-1 shrink-0">{getTypeIcon(item.type)}</div>
              <Avatar src={item.actorAvatarUrl} name={item.actorName} size="md" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    item.read
                      ? 'text-zinc-700 dark:text-zinc-300'
                      : 'font-semibold text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {item.message}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>@{item.actorUsername}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono-num">{formatRelativeTime(item.createdAt)}</span>
                  {!item.read && (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">Unread</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

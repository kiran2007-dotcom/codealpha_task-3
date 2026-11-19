import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus, Send, X } from 'lucide-react';
import { useSocialActions } from '../contexts/SocialActionsContext';
import { formatRelativeTime } from '../lib/validation';
import { getConversationId } from '../services/socialService';
import {
  BLUEPRINT_LIMITS,
  type Conversation,
  type MessageItem,
  type UserPublic,
} from '../types/social';
import { Avatar } from './Avatar';

interface MessagesViewProps {
  currentUser: UserPublic;
  allUsers: UserPublic[];
  usersMap: Record<string, UserPublic>;
  conversations: Conversation[];
  messages: MessageItem[];
  selectedRecipientId: string | null;
  onSelectRecipientId: (uid: string | null) => void;
  onOpenProfile: (uid: string) => void;
}

export function MessagesView({
  currentUser,
  allUsers,
  usersMap,
  conversations,
  messages,
  selectedRecipientId,
  onSelectRecipientId,
  onOpenProfile,
}: MessagesViewProps) {
  const actions = useSocialActions();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversationId = selectedRecipientId
    ? getConversationId(currentUser.uid, selectedRecipientId)
    : null;

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messages
      .filter((m) => m.conversationId === activeConversationId)
      .sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
  }, [activeConversationId, messages]);

  useEffect(() => {
    const unreadIncomingIds = activeMessages
      .filter((m) => m.receiverId === currentUser.uid && !m.read)
      .map((m) => m.id);
    if (unreadIncomingIds.length > 0) {
      void actions.markMessagesRead(unreadIncomingIds);
    }
  }, [actions, activeMessages, currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedRecipientId]);

  const otherUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers
      .filter((u) => u.uid !== currentUser.uid)
      .filter((u) => !q || u.fullNameLower.includes(q) || u.usernameLower.includes(q));
  }, [allUsers, currentUser.uid, userSearch]);

  const selectedRecipient = selectedRecipientId ? usersMap[selectedRecipientId] : undefined;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipient || !draft.trim() || sending) return;
    setError(null);
    setSending(true);
    try {
      await actions.sendMessage(selectedRecipient, draft);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-112px)] md:h-[calc(100vh-57px)] bg-white dark:bg-zinc-950">
      <div
        className={`md:col-span-5 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden ${
          selectedRecipientId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Conversations
          </span>
          <button
            type="button"
            onClick={() => setNewChatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>New message</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No conversations yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
                Start a private one-to-one thread with any ConnectSphere member.
              </p>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(true)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                Start conversation
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherId = conv.participantIds.find((id) => id !== currentUser.uid) || '';
              const otherUser = usersMap[otherId];
              if (!otherUser) return null;
              const isSelected = selectedRecipientId === otherId;
              const unreadCount = messages.filter(
                (m) =>
                  m.conversationId === conv.id &&
                  m.receiverId === currentUser.uid &&
                  !m.read
              ).length;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelectRecipientId(otherId)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-900'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                >
                  <Avatar src={otherUser.avatarUrl} name={otherUser.fullName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {otherUser.fullName}
                      </span>
                      <span className="font-mono-num text-[11px] text-zinc-400 shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {conv.lastSenderId === currentUser.uid ? 'You: ' : ''}
                        {conv.lastMessage}
                      </p>
                      {unreadCount > 0 && (
                        <span className="font-mono-num text-[11px] font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-1.5 py-0.5 rounded shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div
        className={`md:col-span-7 flex flex-col overflow-hidden ${
          selectedRecipientId ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedRecipient ? (
          <>
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectRecipientId(null)}
                  className="md:hidden text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProfile(selectedRecipient.uid)}
                  className="flex items-center gap-3 min-w-0 text-left group"
                >
                  <Avatar
                    src={selectedRecipient.avatarUrl}
                    name={selectedRecipient.fullName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                      {selectedRecipient.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      @{selectedRecipient.username}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/40 dark:bg-zinc-950">
              {activeMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Say hello to {selectedRecipient.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Messages are visible only to you and @{selectedRecipient.username}.
                    </p>
                  </div>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMine = msg.senderId === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isMine
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-sm'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="font-mono-num text-[10px] text-zinc-400 mt-1 px-1">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0"
            >
              {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message @${selectedRecipient.username}...`}
                  maxLength={BLUEPRINT_LIMITS.messageContentMax}
                  className="flex-1 px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-zinc-900 dark:focus:border-zinc-400"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Select a conversation
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Choose a thread on the left or start a new one-to-one message.
              </p>
            </div>
          </div>
        )}
      </div>

      {newChatModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New message"
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setNewChatModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[80vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-display font-bold text-zinc-900 dark:text-zinc-100">
                New message
              </h2>
              <button
                type="button"
                onClick={() => setNewChatModalOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or @username..."
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {otherUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No users found.
                </div>
              ) : (
                otherUsers.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => {
                      onSelectRecipientId(u.uid);
                      setNewChatModalOpen(false);
                      setUserSearch('');
                    }}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <Avatar src={u.avatarUrl} name={u.fullName} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {u.fullName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

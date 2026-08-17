import React, { useState, useEffect, useCallback } from 'react';
import { api, authStorage } from './api/client';
import { Chat, Participant, Message } from './types';
import { LoginModal } from './components/Auth/LoginModal';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatView } from './components/Chat/ChatView';
import { ContactInfoDrawer } from './components/Drawer/ContactInfoDrawer';
import { UploadModal } from './components/Modals/UploadModal';
import { MediaLightbox } from './components/Lightbox/MediaLightbox';
import { AnalyticsModal } from './components/Analytics/AnalyticsModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ExportModal } from './components/Modals/ExportModal';
import { useSettings } from './context/SettingsContext';
import { Upload } from 'lucide-react';
import { WAArchiverLogo } from './components/Common/WAArchiverLogo';

export const App: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(authStorage.getToken()));

  // Chats state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreBefore, setHasMoreBefore] = useState(true);
  const [hasMoreAfter, setHasMoreAfter] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters, Drawer & Search
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'info' | 'media' | 'starred' | 'search'>('info');
  const [drawerTargetParticipantId, setDrawerTargetParticipantId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string; name: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth_unauthorized', handleUnauthorized);

    if (isAuthenticated) {
      loadChats();
    }

    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [isAuthenticated]);

  // Load all chats & restore active chat
  const loadChats = async () => {
    try {
      const res = await api.getChats();
      setChats(res.chats);
      if (res.chats.length > 0) {
        // Restore active chat from URL hash or localStorage
        const urlChatId = window.location.hash.replace(/^#\/?(chat\/)?/, '').trim();
        const savedChatId = localStorage.getItem('wa_active_chat_id');
        
        let targetId = res.chats[0].id;
        if (urlChatId && res.chats.some(c => c.id === urlChatId)) {
          targetId = urlChatId;
        } else if (savedChatId && res.chats.some(c => c.id === savedChatId)) {
          targetId = savedChatId;
        }
        
        selectChat(targetId);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  // Update chat metadata (e.g. renamed group/chat)
  const handleUpdateChat = (updatedChat: Chat) => {
    setActiveChat(updatedChat);
    setChats(prev => prev.map(c => c.id === updatedChat.id ? { ...c, name: updatedChat.name } : c));
  };

  // Select a chat (loads around saved anchor or latest messages)
  const selectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    localStorage.setItem('wa_active_chat_id', chatId);
    if (window.location.hash !== `#/chat/${chatId}`) {
      window.history.replaceState(null, '', `#/chat/${chatId}`);
    }

    setDateFilter(null);
    setHighlightedMsgId(null);
    setLoadingMessages(true);

    try {
      const chatRes = await api.getChat(chatId);
      setActiveChat(chatRes.chat);
      setParticipants(chatRes.participants);

      const savedAnchorStr = localStorage.getItem(`wa_anchor_${chatId}`);
      let savedAnchor: { msgId?: string; offsetPx?: number; isAtBottom?: boolean } | null = null;
      if (savedAnchorStr) {
        try {
          savedAnchor = JSON.parse(savedAnchorStr);
        } catch {
          savedAnchor = null;
        }
      }

      if (savedAnchor && !savedAnchor.isAtBottom && savedAnchor.msgId) {
        const msgsRes = await api.getMessages(chatId, { aroundId: savedAnchor.msgId, limit: 100 });
        setMessages(msgsRes.messages);
        setHasMoreBefore(msgsRes.hasMoreBefore);
        setHasMoreAfter(msgsRes.hasMoreAfter);
      } else {
        const msgsRes = await api.getMessages(chatId, { limit: 80 });
        setMessages(msgsRes.messages);
        setHasMoreBefore(msgsRes.hasMoreBefore);
        setHasMoreAfter(false);
      }
    } catch (err) {
      console.error('Failed to load chat details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load older messages when scrolling UP (infinite scroll up)
  const handleLoadMoreOlder = useCallback(async () => {
    if (!activeChatId || messages.length === 0 || isLoadingMore || !hasMoreBefore) return;
    setIsLoadingMore(true);
    try {
      const oldestTs = messages[0].timestamp;
      const res = await api.getMessages(activeChatId, {
        beforeTimestamp: oldestTs,
        limit: 80
      });
      if (res.messages.length > 0) {
        setMessages(prev => [...res.messages, ...prev]);
        setHasMoreBefore(res.hasMoreBefore);
      } else {
        setHasMoreBefore(false);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeChatId, messages, isLoadingMore, hasMoreBefore]);

  // Load newer messages when scrolling DOWN (infinite scroll down)
  const handleLoadMoreNewer = useCallback(async () => {
    if (!activeChatId || messages.length === 0 || isLoadingMore || !hasMoreAfter) return;
    setIsLoadingMore(true);
    try {
      const newestTs = messages[messages.length - 1].timestamp;
      const res = await api.getMessages(activeChatId, {
        afterTimestamp: newestTs,
        limit: 80
      });
      if (res.messages.length > 0) {
        setMessages(prev => [...prev, ...res.messages]);
        setHasMoreAfter(res.hasMoreAfter);
      } else {
        setHasMoreAfter(false);
      }
    } catch (err) {
      console.error('Failed to load newer messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeChatId, messages, isLoadingMore, hasMoreAfter]);

  // Return to latest messages at bottom
  const handleScrollToLatest = useCallback(async () => {
    if (!activeChatId) return;
    setLoadingMessages(true);
    try {
      const res = await api.getMessages(activeChatId, { limit: 80 });
      setMessages(res.messages);
      setHasMoreBefore(res.hasMoreBefore);
      setHasMoreAfter(false);
      localStorage.setItem(`wa_anchor_${activeChatId}`, JSON.stringify({ isAtBottom: true }));
    } catch (err) {
      console.error('Failed to load latest messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeChatId]);

  // Filter messages by date
  const handleSelectDateFilter = useCallback(async (date: string | null) => {
    if (!activeChatId) return;
    setDateFilter(date);
    setLoadingMessages(true);
    try {
      const res = await api.getMessages(activeChatId, {
        startDate: date || undefined,
        endDate: date || undefined,
        limit: 300
      });
      setMessages(res.messages);
      setHasMoreBefore(false);
    } catch (err) {
      console.error('Failed to filter by date:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeChatId]);

  // Open sender's contact profile in the drawer
  const handleSenderClick = useCallback((senderName: string) => {
    if (!activeChatId) return;
    const matched = participants.find(p => p.display_name === senderName || p.raw_name === senderName);
    if (matched) {
      setDrawerTargetParticipantId(matched.id);
      setDrawerTab('info');
      setIsDrawerOpen(true);
    }
  }, [activeChatId, participants]);

  // Jump to message (loads context around message if not in current window)
  const handleJumpToMessage = useCallback(async (msgId: string) => {
    if (!activeChatId) return;
    setHighlightedMsgId(msgId);
    const existing = document.getElementById(`msg-${msgId}`);
    if (existing) {
      existing.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Fetch context around message seamlessly without unmounting canvas
    try {
      const res = await api.getMessages(activeChatId, { aroundId: msgId, limit: 100 });
      setMessages(res.messages);
      setHasMoreBefore(res.hasMoreBefore);
      setHasMoreAfter(res.hasMoreAfter);
    } catch (err) {
      console.error('Failed to jump to message:', err);
    }
  }, [activeChatId]);

  // Delete chat
  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      const remaining = chats.filter(c => c.id !== chatId);
      setChats(remaining);
      if (activeChatId === chatId) {
        if (remaining.length > 0) {
          selectChat(remaining[0].id);
        } else {
          setActiveChatId(null);
          setActiveChat(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Handle uploaded chat
  const handleUploadSuccess = (chat: Chat) => {
    setChats(prev => [chat, ...prev]);
    selectChat(chat.id);
  };

  // Open right drawer with specific tab
  const handleOpenDrawerWithTab = (tab: 'info' | 'media' | 'starred' | 'search') => {
    setDrawerTab(tab);
    setIsDrawerOpen(true);
  };

  // Toggle star message
  const handleToggleStarMessage = async (msgId: string, isStarred: boolean) => {
    if (!activeChatId) return;
    try {
      await api.toggleStarMessage(activeChatId, msgId, isStarred);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_starred: isStarred ? 1 : 0 } : m));
    } catch (err) {
      console.error('Failed to toggle star message:', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={() => { setIsAuthenticated(true); loadChats(); }} />;
  }

  return (
    <div className="app-layout">
      {/* 1. Left Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDeleteChat={handleDeleteChat}
        onLogout={handleLogout}
        theme={settings.theme === 'dark' ? 'dark' : 'light'}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      />

      {/* 2. Main Chat Area */}
      {activeChat ? (
        <ChatView
          chat={activeChat}
          participants={participants}
          messages={messages}
          loading={loadingMessages}
          hasMoreBefore={hasMoreBefore}
          hasMoreAfter={hasMoreAfter}
          isLoadingMore={isLoadingMore}
          onLoadMoreOlder={handleLoadMoreOlder}
          onLoadMoreNewer={handleLoadMoreNewer}
          onScrollToLatest={handleScrollToLatest}
          onJumpToMessage={handleJumpToMessage}
          onOpenDrawer={handleOpenDrawerWithTab}
          onOpenMedia={setLightboxMedia}
          onUpdateChat={handleUpdateChat}
          onOpenExport={() => setIsExportOpen(true)}
          onToggleStarMessage={handleToggleStarMessage}
          dateFilter={dateFilter}
          onClearDateFilter={() => handleSelectDateFilter(null)}
          onSelectDateFilter={handleSelectDateFilter}
          onSenderClick={handleSenderClick}
          highlightedMsgId={highlightedMsgId}
        />
      ) : (
        /* Empty State */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-chat-canvas)',
          position: 'relative',
          padding: '30px',
          textAlign: 'center'
        }}>
          <div className="chat-canvas-doodle" />
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '480px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <WAArchiverLogo size={88} showGlow />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              WA Archiver
            </h2>

            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '26px' }}>
              Select a conversation from the left sidebar or import an exported WhatsApp <code>.zip</code> file with all photos, voice notes, videos, and documents.
            </p>

            <button
              onClick={() => setIsUploadOpen(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '24px',
                backgroundColor: 'var(--wa-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '14.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 168, 132, 0.35)'
              }}
            >
              <Upload size={18} />
              <span>Import WhatsApp .zip Archive</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Right Drawer (Contact Info, Participants, Search, Starred, Media) */}
      {activeChat && (
        <ContactInfoDrawer
          chat={activeChat}
          participants={participants}
          isOpen={isDrawerOpen}
          activeTab={drawerTab}
          targetParticipantId={drawerTargetParticipantId}
          onTabChange={setDrawerTab}
          onClose={() => {
            setIsDrawerOpen(false);
            setDrawerTargetParticipantId(null);
          }}
          onUpdateChat={handleUpdateChat}
          onUpdateParticipants={updated => {
            setParticipants(updated);
            if (activeChatId) selectChat(activeChatId);
          }}
          onOpenMedia={setLightboxMedia}
          onJumpToMessage={handleJumpToMessage}
          onOpenExport={() => setIsExportOpen(true)}
        />
      )}

      {/* 4. Import / Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* 5. Printable PDF & HTML Chat Exporter Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        chat={activeChat}
        participants={participants}
      />

      {/* 6. Full-screen Media Lightbox */}
      <MediaLightbox
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* 7. Chat Analytics Dashboard */}
      <AnalyticsModal
        chat={activeChat}
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {/* 8. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefreshCurrentChat={() => {
          if (activeChatId) selectChat(activeChatId);
        }}
      />
    </div>
  );
};
export default App;

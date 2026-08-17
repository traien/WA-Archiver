import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Image as ImageIcon, 
  Calendar as CalendarIcon, 
  MoreVertical, 
  ArrowDown, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Filter,
  Loader2,
  Edit3,
  Check
} from 'lucide-react';
import { Chat, Participant, Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';

interface ChatViewProps {
  chat: Chat;
  participants: Participant[];
  messages: Message[];
  loading: boolean;
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  isLoadingMore?: boolean;
  onLoadMoreOlder?: () => void;
  onLoadMoreNewer?: () => void;
  onScrollToLatest?: () => void;
  onJumpToMessage?: (msgId: string) => void;
  onOpenDrawer: (tab: 'info' | 'media' | 'search') => void;
  onOpenMedia: (media: { url: string; type: string; name: string }) => void;
  onUpdateChat?: (updated: Chat) => void;
  dateFilter: string | null;
  onClearDateFilter: () => void;
  onSelectDateFilter: (date: string | null) => void;
  onSenderClick: (senderName: string) => void;
  highlightedMsgId: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  participants,
  messages,
  loading,
  hasMoreBefore = false,
  hasMoreAfter = false,
  isLoadingMore = false,
  onLoadMoreOlder,
  onLoadMoreNewer,
  onScrollToLatest,
  onJumpToMessage,
  onOpenDrawer,
  onOpenMedia,
  onUpdateChat,
  dateFilter,
  onClearDateFilter,
  onSelectDateFilter,
  onSenderClick,
  highlightedMsgId
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevScrollHeightRef = useRef<number>(0);
  const anchorRestoredRef = useRef<boolean>(false);
  const activeChatIdRef = useRef<string>(chat.id);
  const saveAnchorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // In-chat search state with 0ms in-memory cache
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchCacheRef = useRef<Map<string, Message[]>>(new Map());

  const { settings, formatDate } = useSettings();

  // Floating sticky active date state
  const [floatingDate, setFloatingDate] = useState<string>('');

  // Date jump dropdown
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<{ date: string; count: number }[]>([]);

  // Header inline rename state
  const [isRenamingHeader, setIsRenamingHeader] = useState(false);
  const [headerChatName, setHeaderChatName] = useState(chat.name);

  // Format date header string
  const formatDateHeader = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    return formatDate(dateStr);
  }, [formatDate]);

  // Reset anchor restoration state & search cache when switching chats
  if (activeChatIdRef.current !== chat.id) {
    activeChatIdRef.current = chat.id;
    anchorRestoredRef.current = false;
    searchCacheRef.current.clear();
  }

  useEffect(() => {
    setHeaderChatName(chat.name);
    setIsRenamingHeader(false);
    setIsSearchOpen(false);
    setInChatSearchQuery('');
    setSearchResults([]);
    setActiveMatchIndex(0);
    setIsWholeWord(false);
    setIsDateDropdownOpen(false);
  }, [chat.id, chat.name]);

  const handleSaveHeaderChatName = async () => {
    if (!headerChatName.trim()) return;
    try {
      const res = await api.updateChat(chat.id, { name: headerChatName.trim() });
      if (onUpdateChat) {
        onUpdateChat(res.chat);
      }
      setIsRenamingHeader(false);
    } catch (err) {
      console.error('Failed to rename chat in header:', err);
    }
  };

  // Load dates for quick navigation
  useEffect(() => {
    api.getChatDates(chat.id).then(res => setAvailableDates(res.dates)).catch(console.error);
  }, [chat.id]);

  const targetScrollMsgIdRef = useRef<string | null>(null);

  // Jump to message (seamlessly handles in-viewport and out-of-viewport search results)
  const jumpToTargetMessage = useCallback((msgId: string) => {
    targetScrollMsgIdRef.current = msgId;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // If not in current rendered window, load context window around target message
    if (onJumpToMessage) {
      onJumpToMessage(msgId);
    }
  }, [onJumpToMessage]);

  const jumpToTargetMessageRef = useRef(jumpToTargetMessage);
  jumpToTargetMessageRef.current = jumpToTargetMessage;

  // Handle in-chat search (instant cache lookup + fast debounced SQLite indexing with whole-word support)
  useEffect(() => {
    const trimmed = inChatSearchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setActiveMatchIndex(0);
      return;
    }

    const cacheKey = `${chat.id}_${isWholeWord ? 'w_' : ''}${trimmed.toLowerCase()}`;
    if (searchCacheRef.current.has(cacheKey)) {
      const cached = searchCacheRef.current.get(cacheKey)!;
      setSearchResults(cached);
      setActiveMatchIndex(0);
      if (cached.length > 0) {
        jumpToTargetMessageRef.current(cached[0].id);
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.getMessages(chat.id, { search: trimmed, wholeWord: isWholeWord, limit: 100 });
        searchCacheRef.current.set(cacheKey, res.messages);
        setSearchResults(res.messages);
        setActiveMatchIndex(0);
        if (res.messages.length > 0) {
          jumpToTargetMessageRef.current(res.messages[0].id);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inChatSearchQuery, isWholeWord, chat.id]);

  const matchingSet = useMemo(() => new Set(searchResults.map(m => m.id)), [searchResults]);

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % searchResults.length;
    setActiveMatchIndex(nextIdx);
    jumpToTargetMessage(searchResults[nextIdx].id);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveMatchIndex(prevIdx);
    jumpToTargetMessage(searchResults[prevIdx].id);
  };

  // 100% Accurate Pixel-Anchor Restoration Algorithm (WhatsApp Web grade)
  useLayoutEffect(() => {
    if (!containerRef.current || loading || messages.length === 0) return;
    const container = containerRef.current;

    // Check if target jump/search message needs immediate layout positioning
    if (targetScrollMsgIdRef.current) {
      const targetEl = document.getElementById(`msg-${targetScrollMsgIdRef.current}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetScrollMsgIdRef.current = null;
        return;
      }
    }

    // A. Prepend Height Delta Adjustment (when infinite scrolling up)
    if (prevScrollHeightRef.current > 0) {
      const heightDelta = container.scrollHeight - prevScrollHeightRef.current;
      if (heightDelta > 0) {
        container.scrollTop += heightDelta;
      }
      prevScrollHeightRef.current = 0;
      return;
    }

    // B. Initial Chat Mount / Chat Switch Anchor Restoration
    if (!anchorRestoredRef.current && !dateFilter && !highlightedMsgId) {
      if (settings.preserveScrollPosition) {
        const savedAnchorStr = localStorage.getItem(`wa_anchor_${chat.id}`);
        let savedAnchor: { msgId?: string; offsetPx?: number; isAtBottom?: boolean } | null = null;
        if (savedAnchorStr) {
          try {
            savedAnchor = JSON.parse(savedAnchorStr);
          } catch {
            savedAnchor = null;
          }
        }

        if (savedAnchor && !savedAnchor.isAtBottom && savedAnchor.msgId) {
          const targetEl = document.getElementById(`msg-${savedAnchor.msgId}`);
          if (targetEl) {
            const containerTop = container.getBoundingClientRect().top;
            const targetTop = targetEl.getBoundingClientRect().top;
            const currentOffset = targetTop - containerTop;
            const desiredOffset = savedAnchor.offsetPx || 0;
            container.scrollTop += (currentOffset - desiredOffset);
            anchorRestoredRef.current = true;
            return;
          }
        }
      }

      // Default: scroll to bottom
      container.scrollTop = container.scrollHeight;
      anchorRestoredRef.current = true;
    }
  }, [messages, loading, chat.id, dateFilter, highlightedMsgId, settings.preserveScrollPosition]);

  // Jump to specific message if highlightedMsgId changed
  useEffect(() => {
    if (highlightedMsgId) {
      const el = document.getElementById(`msg-${highlightedMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedMsgId]);

  // Viewport Anchor Measurement & Background Tracking
  const saveCurrentViewportAnchor = useCallback(() => {
    if (!settings.preserveScrollPosition || !containerRef.current || messages.length === 0 || targetScrollMsgIdRef.current) return;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Check if at bottom
    const isAtBottom = (scrollHeight - scrollTop - clientHeight < 40) && !hasMoreAfter;
    if (isAtBottom) {
      localStorage.setItem(`wa_anchor_${chat.id}`, JSON.stringify({ isAtBottom: true }));
      return;
    }

    // Measure top visible message element
    const containerTop = container.getBoundingClientRect().top;
    const msgEls = container.querySelectorAll('[id^="msg-"]');

    for (let i = 0; i < msgEls.length; i++) {
      const el = msgEls[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      // First element crossing or right below the container top
      if (rect.bottom >= containerTop + 10) {
        const msgId = el.id.replace('msg-', '');
        const offsetPx = Math.round(rect.top - containerTop);
        localStorage.setItem(
          `wa_anchor_${chat.id}`,
          JSON.stringify({ msgId, offsetPx, isAtBottom: false })
        );
        break;
      }
    }
  }, [chat.id, hasMoreAfter, messages.length]);

  // Update floating date indicator based on top-most visible message
  const updateFloatingDate = useCallback(() => {
    if (!containerRef.current || messages.length === 0) return;
    const container = containerRef.current;
    const containerTop = container.getBoundingClientRect().top;
    const msgEls = container.querySelectorAll('[id^="msg-"]');

    for (let i = 0; i < msgEls.length; i++) {
      const el = msgEls[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= containerTop + 15) {
        const msgId = el.id.replace('msg-', '');
        const msg = messages.find(m => m.id === msgId);
        if (msg && msg.date_str) {
          const formatted = formatDateHeader(msg.date_str);
          setFloatingDate(formatted);
        }
        break;
      }
    }
  }, [messages, formatDateHeader]);

  // Set initial floating date on load
  useEffect(() => {
    if (messages.length > 0) {
      setFloatingDate(formatDateHeader(messages[messages.length - 1].date_str));
    }
  }, [messages, formatDateHeader]);

  // Handle scroll events: Bidirectional Infinite Scrolling & Debounced Tracking
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Show/hide floating scroll-to-bottom button
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 180;
    setShowScrollBottom(!isNearBottom || hasMoreAfter);

    // Update active floating date dynamically
    updateFloatingDate();

    // 1. Infinite scroll UP trigger: when within 150px from top
    if (scrollTop < 150 && hasMoreBefore && !isLoadingMore && onLoadMoreOlder) {
      prevScrollHeightRef.current = scrollHeight;
      onLoadMoreOlder();
    }

    // 2. Infinite scroll DOWN trigger: when within 150px from bottom (and not at true latest)
    if (scrollHeight - scrollTop - clientHeight < 150 && hasMoreAfter && !isLoadingMore && onLoadMoreNewer) {
      onLoadMoreNewer();
    }

    // 3. Save viewport anchor (debounced 100ms)
    if (saveAnchorTimeoutRef.current) clearTimeout(saveAnchorTimeoutRef.current);
    saveAnchorTimeoutRef.current = setTimeout(saveCurrentViewportAnchor, 100);
  };

  const handleScrollBottomClick = () => {
    if (hasMoreAfter && onScrollToLatest) {
      onScrollToLatest();
    } else {
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
      }
      localStorage.setItem(`wa_anchor_${chat.id}`, JSON.stringify({ isAtBottom: true }));
    }
  };

  // Group messages by date memoized
  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: Message[] }[] = [];
    let curDate = '';
    let curItems: Message[] = [];

    for (const msg of messages) {
      if (msg.date_str !== curDate) {
        if (curItems.length > 0) {
          groups.push({ date: curDate, items: curItems });
        }
        curDate = msg.date_str;
        curItems = [msg];
      } else {
        curItems.push(msg);
      }
    }
    if (curItems.length > 0) {
      groups.push({ date: curDate, items: curItems });
    }
    return groups;
  }, [messages]);

  const isGroup = chat.type === 'group';
  const currentActiveMsgId = searchResults[activeMatchIndex]?.id || null;

  return (
    <div className="chat-canvas">
      {/* Background Doodle Wallpaper */}
      <div className="chat-canvas-doodle" />

      {/* WhatsApp Sticky Floating Date Header */}
      {floatingDate && (
        <div style={{
          position: 'absolute',
          top: isSearchOpen ? '108px' : '68px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9,
          pointerEvents: 'none',
          transition: 'top 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-system-pill)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            padding: '5px 14px',
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(11,20,26,.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            border: '1px solid rgba(134, 150, 160, 0.15)'
          }}>
            {floatingDate}
          </div>
        </div>
      )}

      {/* Chat Canvas Header */}
      <div style={{
        height: '60px',
        padding: '0 16px',
        backgroundColor: 'var(--bg-header)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        zIndex: 10,
        flexShrink: 0
      }}>
        {/* Contact Info Header Trigger & Inline Rename */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div 
            onClick={() => onOpenDrawer('info')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: isGroup ? '#1f7a8c' : '#008069',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px',
              fontWeight: 600,
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            {isGroup ? <Users size={22} /> : chat.name.charAt(0).toUpperCase()}
          </div>

          <div style={{ minWidth: 0 }}>
            {isRenamingHeader ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={headerChatName}
                  onChange={e => setHeaderChatName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveHeaderChatName();
                    if (e.key === 'Escape') setIsRenamingHeader(false);
                  }}
                  autoFocus
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--wa-primary)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    fontWeight: 600
                  }}
                />
                <button
                  onClick={handleSaveHeaderChatName}
                  style={{ background: 'var(--wa-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setIsRenamingHeader(false)}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div 
                  onClick={() => onOpenDrawer('info')}
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {chat.name}
                </div>
                <button
                  onClick={() => setIsRenamingHeader(true)}
                  title="Rename chat / group"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Edit3 size={13} />
                </button>
              </div>
            )}

            <div 
              onClick={() => onOpenDrawer('info')}
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {isGroup
                ? `${participants.length} participants • ${chat.message_count.toLocaleString()} msgs`
                : `${chat.message_count.toLocaleString()} messages`}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          {/* 1. In-Chat Search Button */}
          <button
            onClick={() => {
              setIsSearchOpen(prev => !prev);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            title="Search inside this conversation"
            style={{
              background: isSearchOpen ? 'rgba(0, 168, 132, 0.2)' : 'none',
              border: 'none',
              color: isSearchOpen ? 'var(--wa-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Search size={20} />
          </button>

          {/* 2. Jump to Date Dropdown */}
          <button
            onClick={() => setIsDateDropdownOpen(prev => !prev)}
            title="Jump to date"
            style={{
              background: dateFilter || isDateDropdownOpen ? 'rgba(0, 168, 132, 0.2)' : 'none',
              border: 'none',
              color: dateFilter || isDateDropdownOpen ? 'var(--wa-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CalendarIcon size={20} />
          </button>

          {/* Date Selector Popover */}
          {isDateDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '40px',
              width: '260px',
              maxHeight: '340px',
              backgroundColor: 'var(--bg-modal)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-main)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Jump to Date ({availableDates.length} days)</span>
                <button
                  onClick={() => setIsDateDropdownOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <input
                  type="date"
                  onChange={e => {
                    if (e.target.value) {
                      onSelectDateFilter(e.target.value);
                      setIsDateDropdownOpen(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                <button
                  onClick={() => {
                    onClearDateFilter();
                    setIsDateDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: !dateFilter ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                    color: 'var(--wa-primary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                >
                  ✨ Show All Dates (Latest)
                </button>

                {availableDates.map(d => (
                  <button
                    key={d.date}
                    onClick={() => {
                      onSelectDateFilter(d.date);
                      setIsDateDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: dateFilter === d.date ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{d.date}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.count} msgs</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Media Gallery Button */}
          <button
            onClick={() => onOpenDrawer('media')}
            title="Open Media Gallery"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ImageIcon size={20} />
          </button>

          {/* 4. Contact Info & Options */}
          <button
            onClick={() => onOpenDrawer('info')}
            title="Contact Info & Participants"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* In-Chat Live Search Bar (WhatsApp Web Style) */}
      {isSearchOpen && (
        <div style={{
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 8,
          animation: 'fadeIn 0.15s ease-out'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '8px',
            padding: '0 10px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search across all messages in SQLite..."
              value={inChatSearchQuery}
              onChange={e => setInChatSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    handlePrevMatch();
                  } else {
                    handleNextMatch();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsSearchOpen(false);
                  setInChatSearchQuery('');
                  setSearchResults([]);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 8px',
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13.5px'
              }}
            />
            {inChatSearchQuery && (
              <button
                onClick={() => { setInChatSearchQuery(''); setSearchResults([]); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Whole Word Match Toggle Button */}
          <button
            onClick={() => setIsWholeWord(prev => !prev)}
            title={isWholeWord ? "Whole Word Match: Enabled (Matches whole words only)" : "Whole Word Match: Disabled (Click to match whole words)"}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: isWholeWord ? '1px solid var(--wa-primary)' : '1px solid var(--border-subtle)',
              backgroundColor: isWholeWord ? 'rgba(0, 168, 132, 0.2)' : 'var(--bg-input)',
              color: isWholeWord ? 'var(--wa-primary)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: isWholeWord ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '12px' }}>\b</span>
            <span>Whole Word</span>
          </button>

          {/* Match Counter & Next/Prev Controls */}
          {searching ? (
            <Loader2 size={16} className="animate-spin" color="var(--wa-primary)" />
          ) : searchResults.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {activeMatchIndex + 1} of {searchResults.length}
              </span>
              <button
                onClick={handlePrevMatch}
                title="Previous match"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={handleNextMatch}
                title="Next match"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          ) : inChatSearchQuery.trim().length >= 2 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              No matches
            </span>
          ) : null}

          <button
            onClick={() => {
              setIsSearchOpen(false);
              setInChatSearchQuery('');
              setSearchResults([]);
            }}
            title="Close Search"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Date Filter Active Banner */}
      {dateFilter && (
        <div style={{
          backgroundColor: 'rgba(0, 168, 132, 0.15)',
          borderBottom: '1px solid rgba(0, 168, 132, 0.3)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
            <Filter size={14} color="var(--wa-primary)" />
            <span>Showing messages for date: <strong>{dateFilter}</strong> ({messages.length} messages)</span>
          </div>

          <button
            onClick={onClearDateFilter}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--wa-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={14} />
            <span>Clear Date Filter</span>
          </button>
        </div>
      )}

      {/* Messages Canvas Area */}
      <div
        ref={containerRef}
        className="chat-scroll-container"
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 0',
          position: 'relative',
          zIndex: 1,
          overflowAnchor: 'none'
        }}
      >
        {/* Infinite Scroll UP Indicator */}
        {isLoadingMore && hasMoreBefore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-system-pill)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid var(--wa-primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              <span>Loading earlier messages...</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: 'var(--text-secondary)'
          }}>
            Loading messages from SQLite database...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)'
          }}>
            No messages found for this selection.
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              {/* Date Header Pill */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '14px 0 10px'
              }}>
                <div style={{
                  backgroundColor: 'var(--bg-system-pill)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: '7px',
                  boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  {formatDateHeader(group.date)}
                </div>
              </div>

              {/* Messages in this Date */}
              {group.items.map(msg => {
                const isMatching = matchingSet.has(msg.id);
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isGroup={isGroup}
                    onOpenMedia={onOpenMedia}
                    onSenderClick={onSenderClick}
                    searchQuery={isMatching ? inChatSearchQuery : ''}
                    wholeWord={isWholeWord}
                    isHighlighted={highlightedMsgId === msg.id || currentActiveMsgId === msg.id}
                  />
                );
              })}
            </div>
          ))
        )}

        {/* Infinite Scroll DOWN Indicator */}
        {isLoadingMore && hasMoreAfter && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-system-pill)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid var(--wa-primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }} />
              <span>Loading newer messages...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={handleScrollBottomClick}
          title={hasMoreAfter ? "Jump to latest messages" : "Scroll to bottom"}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-header)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            transition: 'transform 0.15s'
          }}
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
};

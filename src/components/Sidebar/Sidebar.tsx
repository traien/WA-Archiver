import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  BarChart3, 
  LogOut, 
  Users, 
  Trash2, 
  MessageSquare,
  Settings,
  MoreVertical
} from 'lucide-react';
import { Chat } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { WAArchiverLogo } from '../Common/WAArchiverLogo';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenUpload: () => void;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
  onDeleteChat: (chatId: string) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onOpenUpload,
  onOpenAnalytics,
  onOpenSettings,
  onDeleteChat,
  onLogout,
  theme,
  onToggleTheme
}) => {
  const { formatTime } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'group'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const filteredChats = chats.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.preview_message && c.preview_message.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{
      width: '360px',
      height: '100%',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Top Header Bar */}
      <div style={{
        height: '60px',
        padding: '0 16px',
        backgroundColor: 'var(--bg-header)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative'
      }}>
        {/* App Branding & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <WAArchiverLogo size={34} />
          <div style={{
            fontSize: '15.5px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            WA Archiver
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} ref={menuRef}>
          {/* New Import Button */}
          <button
            onClick={onOpenUpload}
            title="Import WhatsApp .zip archive"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'var(--wa-primary)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 168, 132, 0.35)',
              transition: 'transform 0.15s'
            }}
          >
            <Plus size={20} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Settings & Preferences"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
          >
            <Settings size={19} />
          </button>

          {/* More Options Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="More options"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isMenuOpen ? 'var(--hover-item)' : 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <MoreVertical size={19} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '42px',
                right: '0',
                width: '200px',
                backgroundColor: 'var(--bg-modal)',
                borderRadius: '10px',
                boxShadow: 'var(--shadow-main)',
                border: '1px solid var(--border-subtle)',
                padding: '6px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease-out'
              }}>
                {/* Analytics */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAnalytics();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  className="dropdown-item"
                >
                  <BarChart3 size={16} color="var(--wa-primary)" />
                  <span>Chat Analytics</span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleTheme();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  className="dropdown-item"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun size={16} color="#eab308" />
                      <span>Light Theme</span>
                    </>
                  ) : (
                    <>
                      <Moon size={16} color="#6366f1" />
                      <span>Dark Theme</span>
                    </>
                  )}
                </button>

                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                {/* Log Out */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    fontSize: '13.5px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  className="dropdown-item"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-input)',
          borderRadius: '8px',
          padding: '0 10px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '8px'
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 8px',
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'personal', 'group'] as const).map(ft => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: filterType === ft ? 'rgba(0, 168, 132, 0.2)' : 'transparent',
                color: filterType === ft ? 'var(--wa-primary)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {ft === 'all' ? 'All' : ft === 'personal' ? 'Personal' : 'Groups'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredChats.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <MessageSquare size={36} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.6 }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No chats imported yet
            </div>
            <p style={{ fontSize: '12px', marginTop: '4px', maxWidth: '220px' }}>
              Click the green <strong>+</strong> button above to import a WhatsApp .zip export with media.
            </p>
          </div>
        ) : (
          filteredChats.map(chat => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background-color 0.15s',
                  position: 'relative'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: chat.type === 'group' ? '#1f7a8c' : '#008069',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 600,
                  marginRight: '12px',
                  flexShrink: 0
                }}>
                  {chat.type === 'group' ? <Users size={22} /> : chat.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {chat.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '6px' }}>
                      {chat.preview_time ? formatTime(chat.preview_time) : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '190px'
                    }}>
                      {chat.preview_message || `${chat.message_count} messages`}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: 'rgba(0, 168, 132, 0.15)',
                        color: 'var(--wa-primary)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: 700
                      }}>
                        {chat.message_count}
                      </span>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${chat.name}" and all its extracted media from disk?`)) {
                            onDeleteChat(chat.id);
                          }
                        }}
                        title="Delete chat from disk"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

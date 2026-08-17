import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  User, 
  Phone, 
  Edit3, 
  Check, 
  FileText, 
  Music, 
  Search, 
  CornerDownRight,
  Star,
  Printer
} from 'lucide-react';
import { Chat, Participant, MediaItem, Message } from '../../types';
import { api } from '../../api/client';
import { PARTICIPANT_COLORS } from '../../../server/parser';
import { useSettings } from '../../context/SettingsContext';

interface ContactInfoDrawerProps {
  chat: Chat;
  participants: Participant[];
  isOpen: boolean;
  activeTab: 'info' | 'media' | 'starred' | 'search';
  targetParticipantId?: string | null;
  onTabChange: (tab: 'info' | 'media' | 'starred' | 'search') => void;
  onClose: () => void;
  onUpdateChat?: (updated: Chat) => void;
  onUpdateParticipants: (updated: Participant[]) => void;
  onOpenMedia: (media: { url: string; type: string; name: string }) => void;
  onJumpToMessage: (msgId: string) => void;
  onOpenExport?: () => void;
}

export const ContactInfoDrawer: React.FC<ContactInfoDrawerProps> = ({
  chat,
  participants,
  isOpen,
  activeTab,
  targetParticipantId,
  onTabChange,
  onClose,
  onUpdateChat,
  onUpdateParticipants,
  onOpenMedia,
  onJumpToMessage,
  onOpenExport
}) => {
  const { formatTime, formatDate } = useSettings();

  // Starred messages state
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);
  const [loadingStarred, setLoadingStarred] = useState(false);

  const fetchStarredMessages = async () => {
    setLoadingStarred(true);
    try {
      const res = await api.getStarredMessages(chat.id);
      setStarredMessages(res.messages);
    } catch (err) {
      console.error('Failed to fetch starred messages:', err);
    } finally {
      setLoadingStarred(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'starred') {
      fetchStarredMessages();
    }
  }, [isOpen, activeTab, chat.id]);

  const handleUnstarMessage = async (msgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleStarMessage(chat.id, msgId, false);
      setStarredMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Failed to unstar message:', err);
    }
  };

  // Chat rename state
  const [isEditingChatName, setIsEditingChatName] = useState(false);
  const [editChatName, setEditChatName] = useState(chat.name);

  // Auto-scroll and highlight target participant when drawer opens
  useEffect(() => {
    if (targetParticipantId && isOpen && activeTab === 'info') {
      setTimeout(() => {
        const el = document.getElementById(`participant-${targetParticipantId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
  }, [targetParticipantId, isOpen, activeTab]);

  // Sync editChatName when chat changes
  useEffect(() => {
    setEditChatName(chat.name);
    setIsEditingChatName(false);
  }, [chat.id, chat.name]);

  const handleSaveChatName = async () => {
    if (!editChatName.trim()) return;
    try {
      const res = await api.updateChat(chat.id, { name: editChatName.trim() });
      if (onUpdateChat) {
        onUpdateChat(res.chat);
      }
      setIsEditingChatName(false);
    } catch (err) {
      console.error('Failed to rename chat:', err);
    }
  };

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsMe, setEditIsMe] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // Media state
  const [mediaCategory, setMediaCategory] = useState<'all' | 'images' | 'videos' | 'audio' | 'docs'>('all');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeqRef = React.useRef(0);

  // Load media when opening drawer or changing category
  useEffect(() => {
    if (isOpen && activeTab === 'media') {
      loadMedia(mediaCategory);
    }
  }, [isOpen, activeTab, chat.id]);

  // Reset search and editing state when switching chats
  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    setEditingParticipant(null);
  }, [chat.id]);

  const loadMedia = async (cat: 'all' | 'images' | 'videos' | 'audio' | 'docs') => {
    setMediaCategory(cat);
    setLoadingMedia(true);
    try {
      const res = await api.getChatMedia(chat.id, cat);
      setMediaItems(res.media);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const executeSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const currentSeq = ++searchSeqRef.current;
    setSearching(true);
    try {
      const res = await api.getMessages(chat.id, { search: q, wholeWord: searchWholeWord, limit: 100 });
      if (currentSeq === searchSeqRef.current) {
        setSearchResults(res.messages);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      if (currentSeq === searchSeqRef.current) {
        setSearching(false);
      }
    }
  };

  // Live search when typing with 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchWholeWord, chat.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleStartEditParticipant = (p: Participant) => {
    setEditingParticipant(p);
    setEditDisplayName(p.display_name);
    setEditPhone(p.phone_number || '');
    setEditColor(p.color);
    setEditIsMe(Boolean(p.is_me));
    setEditNotes(p.notes || '');
  };

  const handleSaveParticipant = async () => {
    if (!editingParticipant) return;
    try {
      const res = await api.updateParticipant(chat.id, editingParticipant.id, {
        display_name: editDisplayName.trim() || editingParticipant.raw_name,
        phone_number: editPhone.trim(),
        color: editColor,
        is_me: editIsMe ? 1 : 0,
        notes: editNotes.trim()
      });
      onUpdateParticipants(res.participants);
      setEditingParticipant(null);
    } catch (err) {
      console.error('Failed to save participant:', err);
    }
  };

  const handleToggleIsMe = async (p: Participant, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newIsMe = p.is_me ? 0 : 1;
      const res = await api.updateParticipant(chat.id, p.id, {
        is_me: newIsMe
      });
      onUpdateParticipants(res.participants);
    } catch (err) {
      console.error('Failed to toggle is_me:', err);
    }
  };

  // Participant search state
  const [participantSearch, setParticipantSearch] = useState('');

  const filteredParticipants = participants.filter(p => {
    if (!participantSearch.trim()) return true;
    const q = participantSearch.toLowerCase().trim();
    return p.display_name.toLowerCase().includes(q) ||
           p.raw_name.toLowerCase().includes(q) ||
           p.phone_number.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div style={{
      width: '380px',
      height: '100%',
      backgroundColor: 'var(--bg-drawer)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      flexShrink: 0
    }}>
      {/* Drawer Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {activeTab === 'info' ? 'Contact Info' : activeTab === 'media' ? 'Media & Docs' : activeTab === 'starred' ? 'Starred Messages' : 'Search in Chat'}
          </span>
        </div>
      </div>

      {/* 4 Clean Tabs Navigation: Participants, Media, Starred, Search */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-header)'
      }}>
        <button
          onClick={() => onTabChange('info')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: `2.5px solid ${activeTab === 'info' ? 'var(--wa-primary)' : 'transparent'}`,
            color: activeTab === 'info' ? 'var(--wa-primary)' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Info
        </button>

        <button
          onClick={() => onTabChange('media')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: `2.5px solid ${activeTab === 'media' ? 'var(--wa-primary)' : 'transparent'}`,
            color: activeTab === 'media' ? 'var(--wa-primary)' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Media ({chat.media_count})
        </button>

        <button
          onClick={() => onTabChange('starred')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: `2.5px solid ${activeTab === 'starred' ? 'var(--wa-primary)' : 'transparent'}`,
            color: activeTab === 'starred' ? 'var(--wa-primary)' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Star size={13} fill={activeTab === 'starred' ? 'var(--wa-primary)' : 'none'} />
          <span>Starred</span>
        </button>

        <button
          onClick={() => onTabChange('search')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: `2.5px solid ${activeTab === 'search' ? 'var(--wa-primary)' : 'transparent'}`,
            color: activeTab === 'search' ? 'var(--wa-primary)' : 'var(--text-secondary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </div>

      {/* Drawer Body Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        
        {/* TAB 1: PARTICIPANTS & CHAT INFO */}
        {activeTab === 'info' && (
          <div>
            {/* Chat Profile Header Card */}
            <div style={{
              backgroundColor: 'var(--bg-modal)',
              padding: '18px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: chat.type === 'group' ? 'var(--wa-primary)' : '#1f7a8c',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                fontSize: '24px',
                fontWeight: 600
              }}>
                {chat.type === 'group' ? <Users size={32} /> : chat.name.charAt(0).toUpperCase()}
              </div>
              {isEditingChatName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={editChatName}
                    onChange={e => setEditChatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveChatName();
                      if (e.key === 'Escape') setIsEditingChatName(false);
                    }}
                    autoFocus
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--wa-primary)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14.5px',
                      fontWeight: 600,
                      textAlign: 'center',
                      width: '80%'
                    }}
                  />
                  <button
                    onClick={handleSaveChatName}
                    title="Save name"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--wa-primary)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setIsEditingChatName(false)}
                    title="Cancel"
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {chat.name}
                  </h3>
                  <button
                    onClick={() => setIsEditingChatName(true)}
                    title="Rename conversation / group"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px'
                    }}
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {chat.type === 'group' ? `Group Chat • ${participants.length} participants` : 'Personal Conversation (1:1)'}
              </div>
            </div>

            {/* Export & Print Action */}
            {onOpenExport && (
              <div style={{
                backgroundColor: 'var(--bg-modal)',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Printer size={18} color="var(--wa-primary)" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Export & Print Chat
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Printable PDF & Standalone HTML
                    </div>
                  </div>
                </div>
                <button
                  onClick={onOpenExport}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--wa-primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Export
                </button>
              </div>
            )}

            {/* Participants Section with Search */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Participants ({filteredParticipants.length})
                </div>
              </div>

              {/* Participant Search Input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-input)',
                borderRadius: '8px',
                padding: '0 10px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '10px'
              }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search participants by name or number..."
                  value={participantSearch}
                  onChange={e => setParticipantSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px'
                  }}
                />
                {participantSearch && (
                  <button
                    onClick={() => setParticipantSearch('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredParticipants.map(p => {
                  const isTarget = targetParticipantId === p.id;
                  return (
                    <div
                      key={p.id}
                      id={`participant-${p.id}`}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: isTarget ? 'rgba(0, 168, 132, 0.12)' : 'var(--bg-modal)',
                        border: `1px solid ${isTarget ? 'var(--wa-primary)' : p.is_me ? 'var(--wa-primary)' : 'var(--border-color)'}`,
                        boxShadow: isTarget ? '0 0 0 2px var(--wa-primary)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: p.color,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>{p.display_name}</span>
                          {Boolean(p.is_me) && (
                            <span style={{
                              backgroundColor: 'rgba(0, 168, 132, 0.15)',
                              color: 'var(--wa-primary)',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '10px'
                            }}>
                              YOU (ME)
                            </span>
                          )}
                        </div>

                        <div style={{
                          fontSize: '11.5px',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {p.phone_number ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={10} /> {p.phone_number}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.6 }}>Raw: {p.raw_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={(e) => handleToggleIsMe(p, e)}
                        title={p.is_me ? "Marked as You (Outgoing Green). Click to unmark." : "Click to mark this participant as You (Multiple allowed)"}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: p.is_me ? '1px solid var(--wa-primary)' : '1px solid var(--border-subtle)',
                          backgroundColor: p.is_me ? 'rgba(0, 168, 132, 0.15)' : 'var(--bg-input)',
                          color: p.is_me ? 'var(--wa-primary)' : 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <User size={12} />
                        <span>{p.is_me ? 'Me' : '+ Me'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEditParticipant(p)}
                        title="Edit display name, phone number, or notes"
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Modal for Editing Participant */}
            {editingParticipant && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                <div style={{
                  backgroundColor: 'var(--bg-modal)',
                  borderRadius: '12px',
                  padding: '24px',
                  width: '100%',
                  maxWidth: '400px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-main)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Edit Participant Details
                    </h4>
                    <button
                      onClick={() => setEditingParticipant(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Display Name / Alias
                    </label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={e => setEditDisplayName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '13.5px'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Phone Number / WhatsApp ID
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '13.5px'
                      }}
                    />
                  </div>

                  {/* "Is Me" Checkbox */}
                  <div style={{
                    marginBottom: '16px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 168, 132, 0.08)',
                    border: '1px solid rgba(0, 168, 132, 0.2)'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editIsMe}
                        onChange={e => setEditIsMe(e.target.checked)}
                        style={{ accentColor: 'var(--wa-primary)', marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          This is Me (Format messages as Outgoing Green)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          You can select multiple participants as "Me" (e.g. if you changed phone numbers or accounts).
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Color Picker */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Participant Accent Color
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {PARTICIPANT_COLORS.map(c => (
                        <div
                          key={c}
                          onClick={() => setEditColor(c)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            cursor: 'pointer',
                            border: editColor === c ? '2.5px solid #ffffff' : 'none',
                            boxShadow: editColor === c ? '0 0 0 1.5px var(--wa-primary)' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      onClick={() => setEditingParticipant(null)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveParticipant}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'var(--wa-primary)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={16} />
                      <span>Save & Apply</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEDIA GALLERY */}
        {activeTab === 'media' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {(['all', 'images', 'videos', 'audio', 'docs'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => loadMedia(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: mediaCategory === cat ? 'var(--wa-primary)' : 'var(--bg-input)',
                    color: mediaCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {loadingMedia ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                Loading media...
              </div>
            ) : mediaItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No media files found in this category
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px'
              }}>
                {mediaItems.map(m => (
                  <div
                    key={m.id}
                    onClick={() => onOpenMedia({ url: m.media_path, type: m.type, name: m.media_name })}
                    style={{
                      aspectRatio: '1',
                      backgroundColor: 'var(--bg-media-card)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {m.type === 'image' || m.type === 'sticker' ? (
                      <img
                        src={m.media_path}
                        alt={m.media_name}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : m.type === 'video' ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
                        <video src={m.media_path} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : m.type === 'audio' || m.type === 'voice' ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px' }}>
                        <Music size={24} color="var(--wa-primary)" />
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                          {formatTime(m.time_str)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px' }}>
                        <FileText size={24} color="var(--wa-primary)" />
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                          {m.media_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STARRED MESSAGES */}
        {activeTab === 'starred' && (
          <div>
            {loadingStarred ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading starred messages...
              </div>
            ) : starredMessages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {starredMessages.length} starred message{starredMessages.length === 1 ? '' : 's'}
                </div>
                {starredMessages.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => onJumpToMessage(msg.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-modal)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)';
                      e.currentTarget.style.borderColor = 'var(--wa-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-modal)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: (msg as any).sender_color || 'var(--wa-primary)', fontSize: '12.5px' }}>
                        {(msg as any).sender_name || msg.raw_sender || 'User'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatDate(msg.date_str)} {formatTime(msg.time_str)}
                        </span>
                        <button
                          onClick={(e) => handleUnstarMessage(msg.id, e)}
                          title="Remove from starred"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            color: '#eab308',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Star size={14} fill="#eab308" />
                        </button>
                      </div>
                    </div>

                    <div style={{ color: 'var(--text-primary)', marginBottom: '6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.type !== 'text' && (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: 'rgba(0, 168, 132, 0.12)',
                          color: 'var(--wa-primary)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginRight: '6px'
                        }}>
                          [{msg.type.toUpperCase()}]
                        </span>
                      )}
                      {msg.content}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--wa-primary)', fontWeight: 600 }}>
                      <CornerDownRight size={12} />
                      <span>Click to jump to message in chat</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <Star size={36} color="var(--border-subtle)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  No Starred Messages Yet
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                  Hover over any message in the chat and click the ⭐ icon to bookmark it here for quick access.
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SEARCH IN CHAT */}
        {activeTab === 'search' && (
          <div>
            <form onSubmit={handleSearchSubmit} style={{ marginBottom: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-input)',
                borderRadius: '8px',
                padding: '0 10px',
                border: '1px solid var(--border-subtle)'
              }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search messages by keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '9px 8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Whole Word Match Toggle */}
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSearchWholeWord(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: searchWholeWord ? '1px solid var(--wa-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: searchWholeWord ? 'rgba(0, 168, 132, 0.15)' : 'transparent',
                    color: searchWholeWord ? 'var(--wa-primary)' : 'var(--text-secondary)',
                    fontSize: '11.5px',
                    fontWeight: searchWholeWord ? 600 : 400,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>\b</span>
                  <span>Match Whole Word Only</span>
                </button>
              </div>
            </form>

            {searching ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {searchResults.length} messages found
                </div>
                {searchResults.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => onJumpToMessage(msg.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-modal)',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s, border-color 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-hover)';
                      e.currentTarget.style.borderColor = 'var(--wa-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-modal)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: msg.sender_color || 'var(--wa-primary)', fontSize: '12px' }}>
                        {msg.sender_name || msg.raw_sender || 'System'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDate(msg.date_str)} {formatTime(msg.time_str)}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {msg.content}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--wa-primary)', fontWeight: 600 }}>
                      <CornerDownRight size={12} />
                      <span>Click to jump to message in chat</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim().length >= 2 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No messages found matching "{searchQuery}"
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Type any word, phone number, or phrase to search instantly
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

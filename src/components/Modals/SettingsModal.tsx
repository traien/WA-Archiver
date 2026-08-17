import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  Moon, 
  Sun, 
  Monitor, 
  Type, 
  Image as ImageIcon, 
  UserCheck, 
  Volume2, 
  HardDrive, 
  Check, 
  Plus, 
  RefreshCw, 
  Sparkles,
  Layers,
  Sliders
} from 'lucide-react';
import { useSettings, TimeFormat, DateFormat, ThemeMode, FontFamily, BubbleFontSize, AudioSpeed } from '../../context/SettingsContext';
import { api } from '../../api/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCurrentChat?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRefreshCurrentChat }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'identity' | 'media' | 'storage'>('general');

  // Identity input state
  const [newIdentityInput, setNewIdentityInput] = useState('');
  const [syncingIdentities, setSyncingIdentities] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Storage stats state
  const [storageStats, setStorageStats] = useState<{
    dbPath: string;
    dbSize: number;
    mediaDir: string;
    mediaCount: number;
    mediaSize: number;
  } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'storage') {
      loadStorageStats();
    }
  }, [isOpen, activeTab]);

  const loadStorageStats = async () => {
    setLoadingStorage(true);
    try {
      const stats = await api.getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  if (!isOpen) return null;

  const handleAddIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newIdentityInput.trim();
    if (!val) return;
    if (settings.myIdentities.includes(val)) {
      setNewIdentityInput('');
      return;
    }
    const updated = [...settings.myIdentities, val];
    updateSettings({ myIdentities: updated });
    setNewIdentityInput('');
  };

  const handleRemoveIdentity = (idToRemove: string) => {
    const updated = settings.myIdentities.filter(id => id !== idToRemove);
    updateSettings({ myIdentities: updated });
  };

  const handleSyncIdentitiesWithDatabase = async () => {
    setSyncingIdentities(true);
    setSyncResult(null);
    try {
      const res = await api.applyMeIdentities(settings.myIdentities);
      setSyncResult(`Successfully updated ${res.updatedCount} participant records across SQLite!`);
      if (onRefreshCurrentChat) {
        onRefreshCurrentChat();
      }
    } catch (err: any) {
      setSyncResult(`Failed to sync: ${err.message}`);
    } finally {
      setSyncingIdentities(false);
    }
  };

  const handleClearSavedAnchors = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wa_anchor_')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    alert(`Cleared ${keysToRemove.length} saved chat scroll positions.`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 20, 26, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-modal)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '720px',
        height: '85vh',
        maxHeight: '680px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-main)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--wa-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Settings & Preferences
            </h2>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--wa-primary)',
              backgroundColor: 'rgba(0, 168, 132, 0.12)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(0, 168, 132, 0.25)'
            }}>
              WA Archiver v1.0.0
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Tabs Sidebar + Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Navigation Sidebar */}
          <div style={{
            width: '200px',
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid var(--border-color)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {[
              { id: 'general', label: 'General', icon: Clock },
              { id: 'appearance', label: 'Appearance', icon: Layers },
              { id: 'identity', label: 'My Identity (Me)', icon: UserCheck },
              { id: 'media', label: 'Media & Audio', icon: Volume2 },
              { id: 'storage', label: 'Storage & Data', icon: HardDrive }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--wa-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={17} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div style={{ marginTop: 'auto', padding: '8px' }}>
              <button
                onClick={resetSettings}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <RefreshCw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* ================= TAB 1: GENERAL ================= */}
            {activeTab === 'general' && (
              <>
                {/* 12h vs 24h Time System */}
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--wa-primary)" />
                    <span>Time System (12-Hour vs 24-Hour)</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Choose how message timestamps and conversation times are formatted across the app.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: '12h' as TimeFormat, label: '12-Hour System', sample: '2:45 PM / 10:15 AM' },
                      { id: '24h' as TimeFormat, label: '24-Hour System', sample: '14:45 / 10:15' }
                    ].map(fmt => (
                      <div
                        key={fmt.id}
                        onClick={() => updateSettings({ timeFormat: fmt.id })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${settings.timeFormat === fmt.id ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                          backgroundColor: settings.timeFormat === fmt.id ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{fmt.label}</span>
                          {settings.timeFormat === fmt.id && <Check size={16} color="var(--wa-primary)" />}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Example: {fmt.sample}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Format */}
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--wa-primary)" />
                    <span>Date Format</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Used for date dividers, floating sticky headers, and date pickers.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'DD/MM/YYYY' as DateFormat, label: 'DD/MM/YYYY', sample: '17/08/2026' },
                      { id: 'YYYY-MM-DD' as DateFormat, label: 'YYYY-MM-DD', sample: '2026-08-17' },
                      { id: 'MM/DD/YYYY' as DateFormat, label: 'MM/DD/YYYY', sample: '08/17/2026' },
                      { id: 'D MMMM YYYY' as DateFormat, label: 'Full Text Date', sample: '17 August 2026' }
                    ].map(fmt => (
                      <div
                        key={fmt.id}
                        onClick={() => updateSettings({ dateFormat: fmt.id })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${settings.dateFormat === fmt.id ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                          backgroundColor: settings.dateFormat === fmt.id ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{fmt.label}</span>
                          {settings.dateFormat === fmt.id && <Check size={16} color="var(--wa-primary)" />}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmt.sample}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preserve Scroll Position Option */}
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Preserve Exact Reading Position
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Remember the exact message and pixel scroll location per chat across browser sessions.
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                      <input
                        type="checkbox"
                        checked={settings.preserveScrollPosition}
                        onChange={e => updateSettings({ preserveScrollPosition: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: settings.preserveScrollPosition ? 'var(--wa-primary)' : 'var(--border-subtle)',
                        borderRadius: '24px',
                        transition: '0.2s'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '18px',
                          width: '18px',
                          left: settings.preserveScrollPosition ? '22px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s'
                        }} />
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button
                      onClick={handleClearSavedAnchors}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All Saved Chat Positions
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ================= TAB 2: APPEARANCE ================= */}
            {activeTab === 'appearance' && (
              <>
                {/* Theme Selection */}
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Theme
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'dark' as ThemeMode, label: 'Dark Mode', icon: Moon },
                      { id: 'light' as ThemeMode, label: 'Light Mode', icon: Sun },
                      { id: 'system' as ThemeMode, label: 'System Auto', icon: Monitor }
                    ].map(t => {
                      const Icon = t.icon;
                      const isSelected = settings.theme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => updateSettings({ theme: t.id })}
                          style={{
                            padding: '14px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isSelected ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                            backgroundColor: isSelected ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Icon size={20} color={isSelected ? 'var(--wa-primary)' : 'var(--text-secondary)'} />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Typography / Font Family */}
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Type size={16} color="var(--wa-primary)" />
                    <span>Text Font Type</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Select the typography used for chat messages, Arabic/English text, and interface elements.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'whatsapp' as FontFamily, label: 'WhatsApp Official (Default)', font: '-apple-system, Segoe UI, sans-serif', sample: 'مرحباً، كيف حالك؟ Hello World' },
                      { id: 'cairo' as FontFamily, label: 'Cairo (Modern Arabic)', font: "'Cairo', sans-serif", sample: 'مرحباً، كيف حالك؟ Hello World' },
                      { id: 'tajawal' as FontFamily, label: 'Tajawal (Clean Rounded)', font: "'Tajawal', sans-serif", sample: 'مرحباً، كيف حالك؟ Hello World' },
                      { id: 'ibm-plex' as FontFamily, label: 'IBM Plex Sans', font: "'IBM Plex Sans Arabic', sans-serif", sample: 'مرحباً، كيف حالك؟ Hello World' },
                      { id: 'system' as FontFamily, label: 'Native System UI', font: 'system-ui, sans-serif', sample: 'مرحباً، كيف حالك؟ Hello World' },
                      { id: 'monospace' as FontFamily, label: 'Monospace Code', font: 'monospace', sample: 'مرحباً، كيف حالك؟ Hello World' }
                    ].map(f => (
                      <div
                        key={f.id}
                        onClick={() => updateSettings({ fontFamily: f.id })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${settings.fontFamily === f.id ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                          backgroundColor: settings.fontFamily === f.id ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{f.label}</span>
                          {settings.fontFamily === f.id && <Check size={16} color="var(--wa-primary)" />}
                        </div>
                        <span style={{ fontFamily: f.font, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {f.sample}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Bubble Font Size */}
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Message Bubble Font Size
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'small' as BubbleFontSize, label: 'Compact (13px)' },
                      { id: 'medium' as BubbleFontSize, label: 'Standard (14.2px)' },
                      { id: 'large' as BubbleFontSize, label: 'Large (16px)' }
                    ].map(s => (
                      <div
                        key={s.id}
                        onClick={() => updateSettings({ bubbleFontSize: s.id })}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${settings.bubbleFontSize === s.id ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                          backgroundColor: settings.bubbleFontSize === s.id ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: settings.bubbleFontSize === s.id ? 600 : 400,
                          color: settings.bubbleFontSize === s.id ? 'var(--wa-primary)' : 'var(--text-primary)'
                        }}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Wallpaper Doodle Controls */}
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon size={18} color="var(--wa-primary)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          WhatsApp Doodle Wallpaper
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Display authentic WhatsApp doodles behind chat messages.
                        </div>
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                      <input
                        type="checkbox"
                        checked={settings.showDoodleWallpaper}
                        onChange={e => updateSettings({ showDoodleWallpaper: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: settings.showDoodleWallpaper ? 'var(--wa-primary)' : 'var(--border-subtle)',
                        borderRadius: '24px',
                        transition: '0.2s'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: settings.showDoodleWallpaper ? '22px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s'
                        }} />
                      </span>
                    </label>
                  </div>

                  {settings.showDoodleWallpaper && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Wallpaper Opacity</span>
                        <span>{settings.wallpaperOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={settings.wallpaperOpacity}
                        onChange={e => updateSettings({ wallpaperOpacity: parseInt(e.target.value, 10) })}
                        style={{ width: '100%', accentColor: 'var(--wa-primary)' }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= TAB 3: MY IDENTITY ("ME") ================= */}
            {activeTab === 'identity' && (
              <>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18} color="var(--wa-primary)" />
                    <span>My Phone Numbers & Aliases ("Me")</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '18px' }}>
                    Define any names, aliases, or phone numbers that represent <strong>YOU</strong>. All matching senders across every chat will be automatically recognized as outgoing messages (green bubble on the right side).
                  </p>

                  {/* Add New Identity Form */}
                  <form onSubmit={handleAddIdentity} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Add phone (e.g. +96650...) or name (e.g. Osama)"
                      value={newIdentityInput}
                      onChange={e => setNewIdentityInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '13.5px',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--wa-primary)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  </form>

                  {/* Active Identities Tag List */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                    {settings.myIdentities.map(id => (
                      <div
                        key={id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(0, 168, 132, 0.15)',
                          border: '1px solid var(--wa-primary)',
                          color: 'var(--wa-primary)',
                          fontSize: '13px',
                          fontWeight: 500
                        }}
                      >
                        <span>{id}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIdentity(id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--wa-primary)',
                            cursor: 'pointer',
                            padding: '1px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Sync with SQLite Database Button */}
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          Sync with SQLite Database
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Updates all past and current conversations in SQLite to align your messages to the right.
                        </div>
                      </div>
                      <button
                        onClick={handleSyncIdentitiesWithDatabase}
                        disabled={syncingIdentities}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--wa-primary)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: syncingIdentities ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Sparkles size={15} />
                        <span>{syncingIdentities ? 'Syncing...' : 'Sync All Chats'}</span>
                      </button>
                    </div>

                    {syncResult && (
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: syncResult.includes('Successfully') ? 'rgba(0, 168, 132, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: syncResult.includes('Successfully') ? 'var(--wa-primary)' : '#ef4444',
                        fontSize: '12px',
                        fontWeight: 500
                      }}>
                        {syncResult}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ================= TAB 4: MEDIA & AUDIO ================= */}
            {activeTab === 'media' && (
              <>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={18} color="var(--wa-primary)" />
                    <span>Voice Note & Audio Playback</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Choose your default playback speed for WhatsApp voice notes.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { speed: 1 as AudioSpeed, label: '1.0x (Normal)' },
                      { speed: 1.5 as AudioSpeed, label: '1.5x (Fast)' },
                      { speed: 2 as AudioSpeed, label: '2.0x (Double Speed)' }
                    ].map(item => (
                      <div
                        key={item.speed}
                        onClick={() => updateSettings({ defaultAudioSpeed: item.speed })}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${settings.defaultAudioSpeed === item.speed ? 'var(--wa-primary)' : 'var(--border-subtle)'}`,
                          backgroundColor: settings.defaultAudioSpeed === item.speed ? 'rgba(0, 168, 132, 0.1)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: settings.defaultAudioSpeed === item.speed ? 600 : 400,
                          color: settings.defaultAudioSpeed === item.speed ? 'var(--wa-primary)' : 'var(--text-primary)',
                          fontSize: '13px'
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ================= TAB 5: STORAGE & DATA ================= */}
            {activeTab === 'storage' && (
              <>
                <div>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={18} color="var(--wa-primary)" />
                    <span>Local SQLite Database & Media Storage</span>
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    All data is stored physically on your local machine with 100% offline privacy.
                  </p>

                  {loadingStorage ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Calculating storage...</div>
                  ) : storageStats ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SQLite Database File</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {storageStats.dbPath}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--wa-primary)', marginTop: '4px', fontWeight: 500 }}>
                          Size on disk: {formatBytes(storageStats.dbSize)}
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Media Attachments Directory</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {storageStats.mediaDir}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--wa-primary)', marginTop: '4px', fontWeight: 500 }}>
                          {storageStats.mediaCount} files ({formatBytes(storageStats.mediaSize)})
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Cache Cleaning */}
                  <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                    <button
                      onClick={() => {
                        setCacheCleared(true);
                        setTimeout(() => setCacheCleared(false), 2000);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      {cacheCleared ? 'Caches Cleared!' : 'Clear In-Memory Search Caches'}
                    </button>
                  </div>

                  {/* Legal Disclaimer */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.5'
                  }}>
                    <strong>Disclaimer:</strong> WA Archiver is an independent open-source project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC, Meta Platforms, Inc., or any of their subsidiaries or affiliates.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

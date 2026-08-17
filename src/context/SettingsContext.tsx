import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type TimeFormat = '12h' | '24h';
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'D MMMM YYYY';
export type ThemeMode = 'dark' | 'light' | 'system';
export type FontFamily = 'whatsapp' | 'cairo' | 'tajawal' | 'ibm-plex' | 'system' | 'monospace';
export type BubbleFontSize = 'small' | 'medium' | 'large';
export type AudioSpeed = 1 | 1.5 | 2;

export interface AppSettings {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  theme: ThemeMode;
  fontFamily: FontFamily;
  bubbleFontSize: BubbleFontSize;
  preserveScrollPosition: boolean;
  myIdentities: string[];
  showDoodleWallpaper: boolean;
  wallpaperOpacity: number; // 0 to 100
  defaultAudioSpeed: AudioSpeed;
}

const SETTINGS_KEY = 'wa_app_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  timeFormat: '12h',
  dateFormat: 'DD/MM/YYYY',
  theme: 'dark',
  fontFamily: 'whatsapp',
  bubbleFontSize: 'medium',
  preserveScrollPosition: true,
  myIdentities: ['You', 'أنت', 'Me', 'me', 'YOU'],
  showDoodleWallpaper: true,
  wallpaperOpacity: 100,
  defaultAudioSpeed: 1
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  formatTime: (timeStr: string, dateStr?: string) => string;
  formatDate: (dateStr: string) => string;
  isMySender: (senderName?: string | null, phoneNumber?: string | null) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage:', e);
    }
  }, [settings]);

  // Apply Theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        root.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      };
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  // Apply Font Family to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-font', settings.fontFamily);
  }, [settings.fontFamily]);

  // Apply Font Size to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.bubbleFontSize);
  }, [settings.bubbleFontSize]);

  // Apply Wallpaper Opacity & Toggle to DOM
  useEffect(() => {
    const customOpacity = settings.showDoodleWallpaper ? (settings.wallpaperOpacity / 100) : 0;
    document.documentElement.style.setProperty('--chat-wallpaper-custom-opacity', String(customOpacity));
  }, [settings.showDoodleWallpaper, settings.wallpaperOpacity]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Format Time string into 12h or 24h
  const formatTime = useCallback((timeStr: string, _dateStr?: string): string => {
    if (!timeStr) return '';
    try {
      // Clean Arabic digits if present
      const cleaned = timeStr.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).trim();

      // Check if time is already formatted with AM/PM
      let hours = 0;
      let minutes = 0;

      const match12 = cleaned.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM|ص|م)?/i);
      if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const ampm = match12[4]?.toLowerCase();

        if (ampm === 'pm' || ampm === 'م') {
          if (hours < 12) hours += 12;
        } else if (ampm === 'am' || ampm === 'ص') {
          if (hours === 12) hours = 0;
        }
      } else {
        return timeStr;
      }

      if (settings.timeFormat === '24h') {
        const hh = hours.toString().padStart(2, '0');
        const mm = minutes.toString().padStart(2, '0');
        return `${hh}:${mm}`;
      } else {
        // 12-hour format
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const mm = minutes.toString().padStart(2, '0');
        return `${displayHours}:${mm} ${period}`;
      }
    } catch {
      return timeStr;
    }
  }, [settings.timeFormat]);

  // Format Date string (YYYY-MM-DD) into user's chosen date format
  const formatDate = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      const d = new Date(year, month - 1, day);

      switch (settings.dateFormat) {
        case 'DD/MM/YYYY':
          return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        case 'MM/DD/YYYY':
          return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        case 'D MMMM YYYY':
          return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
        default:
          return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      }
    } catch {
      return dateStr;
    }
  }, [settings.dateFormat]);

  // Check if senderName or phoneNumber belongs to "Me"
  const isMySender = useCallback((senderName?: string | null, phoneNumber?: string | null): boolean => {
    if (!senderName && !phoneNumber) return false;
    const cleanNumber = (num: string) => num.replace(/[\s\-\(\)\+]/g, '');

    for (const id of settings.myIdentities) {
      const trimmed = id.trim();
      if (!trimmed) continue;
      if (senderName && senderName.trim().toLowerCase() === trimmed.toLowerCase()) {
        return true;
      }
      if (phoneNumber && cleanNumber(phoneNumber) === cleanNumber(trimmed)) {
        return true;
      }
      if (senderName && cleanNumber(senderName) === cleanNumber(trimmed)) {
        return true;
      }
    }
    return false;
  }, [settings.myIdentities]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      formatTime,
      formatDate,
      isMySender
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

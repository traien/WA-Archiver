export type ChatType = 'personal' | 'group';

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'voice' 
  | 'sticker' 
  | 'document' 
  | 'vcard' 
  | 'system' 
  | 'call' 
  | 'location' 
  | 'deleted';

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  created_at: number;
  message_count: number;
  media_count: number;
  date_start: string | null;
  date_end: string | null;
  export_source: 'ios' | 'android' | 'unknown';
  participants_count?: number;
  preview_message?: string;
  preview_time?: string;
}

export interface Participant {
  id: string;
  chat_id: string;
  raw_name: string;
  display_name: string;
  phone_number: string;
  is_me: number;
  color: string;
  notes?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  timestamp: number;
  date_str: string;
  time_str: string;
  sender_id: string | null;
  raw_sender: string | null;
  sender_name?: string;
  sender_color?: string;
  sender_phone?: string;
  is_me?: number;
  content: string;
  type: MessageType;
  media_name: string | null;
  media_path: string | null;
  media_size: number | null;
  mime_type: string | null;
  is_forwarded: number;
  quoted_text: string | null;
  quoted_sender: string | null;
  reactions: string | null;
  is_starred?: number | boolean;
}

export interface ChatAnalytics {
  totalMessages: number;
  totalMedia: number;
  totalWords: number;
  dateRange: { start: string | null; end: string | null };
  participantStats: {
    id: string;
    name: string;
    color: string;
    messageCount: number;
    wordCount: number;
    mediaCount: number;
    percentage: number;
  }[];
  activityByHour: { hour: number; count: number }[];
  activityByDayOfWeek: { day: number; dayName: string; count: number }[];
  topEmojis: { emoji: string; count: number }[];
  mediaBreakdown: {
    images: number;
    videos: number;
    audios: number;
    stickers: number;
    documents: number;
  };
}

export interface MediaItem {
  id: string;
  chat_id: string;
  timestamp: number;
  date_str: string;
  time_str: string;
  type: MessageType;
  media_name: string;
  media_path: string;
  media_size: number | null;
  mime_type: string | null;
  raw_sender: string | null;
  sender_name?: string;
}

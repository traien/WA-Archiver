import React, { memo } from 'react';
import { 
  CheckCheck, 
  FileText, 
  Download, 
  PhoneMissed, 
  Video as VideoIcon, 
  User as UserIcon,
  CornerDownRight,
  ImageOff,
  Mic,
  Sparkles,
  Pencil
} from 'lucide-react';
import { Message } from '../../types';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { useSettings } from '../../context/SettingsContext';

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
  onOpenMedia: (media: { url: string; type: string; name: string }) => void;
  onSenderClick?: (senderName: string) => void;
  searchQuery?: string;
  wholeWord?: boolean;
  isHighlighted?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  message,
  isGroup,
  onOpenMedia,
  onSenderClick,
  searchQuery = '',
  wholeWord = false,
  isHighlighted = false
}) => {
  const { formatTime, isMySender } = useSettings();
  const isOutgoing = Boolean(message.is_me || isMySender(message.raw_sender, (message as any).sender_phone));
  const isSystem = message.type === 'system' || !message.raw_sender;
  const isMediaAttachment = Boolean(message.media_path) || ['image', 'video', 'audio', 'voice', 'sticker', 'document', 'vcard'].includes(message.type);
  const isMediaOmitted = !message.media_path && (message.content === '<Media omitted>' || message.content.startsWith('<Media omitted>'));

  // Check if message was edited in WhatsApp
  const isEdited = /<تم تعديل هذه الرسالة>|<This message was edited>|<تم تعديل هذا المحتوى>/i.test(message.content);
  let cleanContent = message.content
    .replace(/<تم تعديل هذه الرسالة>/gi, '')
    .replace(/<This message was edited>/gi, '')
    .replace(/<تم تعديل هذا المحتوى>/gi, '')
    .replace(/\((?:file attached|الملف مرفق|ملف مرفق)\)/gi, '')
    .replace(/(?:‎)?(?:audio omitted|<audio omitted>|voice note omitted|<voice note omitted>|صوت مستبعد|تم استبعاد الصوت|تم استبعاد التسجيل الصوتي)/gi, '')
    .replace(/(?:‎)?(?:image omitted|<image omitted>|photo omitted|<photo omitted>|صورة مستبعدة|تم استبعاد الصورة|GIF omitted|<GIF omitted>)/gi, '')
    .replace(/(?:‎)?(?:video omitted|<video omitted>|فيديو مستبعد|تم استبعاد مقطع الفيديو|تم استبعاد الفيديو)/gi, '')
    .replace(/(?:‎)?(?:sticker omitted|<sticker omitted>|ملصق مستبعد|تم استبعاد الملصق)/gi, '')
    .replace(/(?:‎)?(?:contact card omitted|<contact card omitted>|contact omitted|<contact omitted>|تم استبعاد جهة الاتصال|تم استبعاد جهات الاتصال)/gi, '')
    .replace(/(?:‎)?(?:<Media omitted>|media omitted|تم استبعاد الوسائط|<تم استبعاد الوسائط>)/gi, '')
    .trim();

  // If the message has an actual media attachment or is a sticker/image/voice/video/document/vcard,
  // do not show the bare filename or (الملف مرفق) statement
  if (isMediaAttachment) {
    if (
      !cleanContent ||
      cleanContent === message.media_name ||
      cleanContent === '<Media omitted>' ||
      /^\(?(?:file attached|الملف مرفق|ملف مرفق)\)?$/i.test(cleanContent) ||
      /^[A-Za-z0-9_\-.]+\.(jpg|jpeg|png|webp|mp4|mov|3gp|opus|m4a|mp3|ogg|wav|pdf|docx|xlsx|pptx|vcf|zip|dwg|dxf)$/i.test(cleanContent)
    ) {
      cleanContent = '';
    }
  }

  // System Message Banner (e.g. Encryption notice, group created, missed call)
  if (isSystem) {
    const isMissedCall = message.type === 'call' || message.content.toLowerCase().includes('missed');
    return (
      <div 
        id={`msg-${message.id}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '10px 0',
          padding: '0 16px'
        }}
      >
        <div style={{
          backgroundColor: 'var(--bg-system-pill)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          padding: '6px 14px',
          borderRadius: '8px',
          boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
          maxWidth: '85%',
          textAlign: 'center',
          lineHeight: '1.4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          {isMissedCall && <PhoneMissed size={14} color="#e63946" />}
          <span>{cleanContent || message.content}</span>
        </div>
      </div>
    );
  }

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Text formatter with URL linkifier and Search Keyword Highlighting
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    // First check for media omitted string
    if (isMediaOmitted) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 0',
          color: 'var(--text-secondary)'
        }}>
          <ImageOff size={18} color="var(--text-muted)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 500 }}>
              Media omitted in WhatsApp export
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (Not included in export text file)
            </span>
          </div>
        </div>
      );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // Highlight search query if present
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = wholeWord
        ? new RegExp(`(^|[\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-])(${escapedQuery})([\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-]|$)`, 'gi')
        : new RegExp(`(${escapedQuery})`, 'gi');

      const urlParts = text.split(urlRegex);
      return urlParts.map((part, pIdx) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={pIdx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--wa-blue-tick)', textDecoration: 'underline', wordBreak: 'break-all' }}
            >
              {part}
            </a>
          );
        }

        if (wholeWord) {
          // Render with whole word boundary matching
          const tokens: React.ReactNode[] = [];
          let lastIdx = 0;
          let match: RegExpExecArray | null;
          const re = new RegExp(`(^|[\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-])(${escapedQuery})([\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-]|$)`, 'gi');

          while ((match = re.exec(part)) !== null) {
            const prefix = match[1] || '';
            const matchedWord = match[2];
            const matchStart = match.index + prefix.length;
            const matchEnd = matchStart + matchedWord.length;

            if (matchStart > lastIdx) {
              tokens.push(part.substring(lastIdx, matchStart));
            }
            tokens.push(
              <mark
                key={`hw-${matchStart}`}
                style={{
                  backgroundColor: '#ffb703',
                  color: '#000000',
                  borderRadius: '2px',
                  padding: '0 2px',
                  fontWeight: 600
                }}
              >
                {matchedWord}
              </mark>
            );
            lastIdx = matchEnd;
            re.lastIndex = matchEnd;
          }
          if (lastIdx < part.length) {
            tokens.push(part.substring(lastIdx));
          }
          return <span key={pIdx}>{tokens}</span>;
        }

        const matchParts = part.split(searchRegex);
        return (
          <span key={pIdx}>
            {matchParts.map((subPart, sIdx) => {
              if (subPart.toLowerCase() === q.toLowerCase()) {
                return (
                  <mark
                    key={sIdx}
                    style={{
                      backgroundColor: '#ffb703',
                      color: '#000000',
                      borderRadius: '2px',
                      padding: '0 2px',
                      fontWeight: 600
                    }}
                  >
                    {subPart}
                  </mark>
                );
              }
              return <span key={sIdx}>{subPart}</span>;
            })}
          </span>
        );
      });
    }

    // Default URL linkifier
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--wa-blue-tick)', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const senderDisplayName = message.sender_name || message.raw_sender || 'Unknown';
  const senderColor = message.sender_color || '#00a884';

  return (
    <div 
      id={`msg-${message.id}`}
      className="message-bubble-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOutgoing ? 'flex-end' : 'flex-start',
        margin: '2px 0',
        padding: '0 12px',
        position: 'relative'
      }}
    >
      <div 
        className={isHighlighted ? 'highlighted-bubble' : ''}
        style={{
          maxWidth: '82%',
          minWidth: '120px',
          backgroundColor: isHighlighted ? 'rgba(0, 168, 132, 0.35)' : isOutgoing ? 'var(--bg-bubble-out)' : 'var(--bg-bubble-in)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          borderTopRightRadius: isOutgoing ? '2px' : '8px',
          borderTopLeftRadius: !isOutgoing ? '2px' : '8px',
          padding: '6px 9px 6px 9px',
          boxShadow: isHighlighted ? '0 0 0 2px var(--wa-primary)' : 'var(--shadow-bubble)',
          position: 'relative',
          wordBreak: 'break-word',
          fontSize: 'var(--msg-font-size, 14.2px)',
          lineHeight: 'var(--msg-line-height, 19.5px)',
          transition: 'background-color 0.2s, box-shadow 0.2s, transform 0.15s'
        }}
      >
        {/* Group Sender Name */}
        {isGroup && !isOutgoing && (
          <div 
            onClick={() => onSenderClick && onSenderClick(senderDisplayName)}
            style={{
              color: senderColor,
              fontWeight: 600,
              fontSize: '12.8px',
              marginBottom: '3px',
              cursor: onSenderClick ? 'pointer' : 'default'
            }}
          >
            {senderDisplayName}
            {message.sender_phone && message.sender_phone !== senderDisplayName && (
              <span style={{ fontSize: '11px', opacity: 0.7, marginLeft: '6px', fontWeight: 400 }}>
                ({message.sender_phone})
              </span>
            )}
          </div>
        )}

        {/* Quoted Message / Reply */}
        {message.quoted_text && (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
            borderLeft: `4px solid ${senderColor}`,
            padding: '4px 8px',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 600, color: senderColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CornerDownRight size={12} />
              <span>{message.quoted_sender || 'Replied Message'}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {message.quoted_text}
            </div>
          </div>
        )}

        {/* Media Attachments & Placeholders */}
        {/* 1. Voice Note / Audio */}
        {message.media_path && (message.type === 'voice' || message.type === 'audio') && (
          <VoiceNotePlayer
            src={message.media_path}
            senderName={senderDisplayName}
            senderColor={senderColor}
            isOutgoing={isOutgoing}
          />
        )}
        {!message.media_path && (message.type === 'voice' || message.type === 'audio') && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            marginBottom: cleanContent ? '6px' : '2px',
            minWidth: '220px',
            border: '1px dashed rgba(128, 128, 128, 0.25)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              color: 'var(--wa-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Mic size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Voice Note
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Not included in export
              </div>
            </div>
          </div>
        )}

        {/* 2. Image / Photo */}
        {message.media_path && message.type === 'image' && (
          <div 
            onClick={() => onOpenMedia({ url: message.media_path!, type: 'image', name: message.media_name || 'Photo' })}
            style={{
              cursor: 'pointer',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: cleanContent ? '6px' : '2px',
              maxHeight: '340px',
              position: 'relative'
            }}
          >
            <img
              src={message.media_path}
              alt={message.media_name || 'Photo'}
              loading="lazy"
              style={{
                width: '100%',
                maxHeight: '340px',
                objectFit: 'cover',
                display: 'block',
                borderRadius: '6px'
              }}
            />
          </div>
        )}
        {!message.media_path && message.type === 'image' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            marginBottom: cleanContent ? '6px' : '2px',
            minWidth: '180px',
            border: '1px dashed rgba(128, 128, 128, 0.25)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ImageOff size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Photo
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Not included in export
              </div>
            </div>
          </div>
        )}

        {/* 3. Sticker (WebP) */}
        {message.media_path && message.type === 'sticker' && (
          <div 
            onClick={() => onOpenMedia({ url: message.media_path!, type: 'image', name: message.media_name || 'Sticker' })}
            style={{
              cursor: 'pointer',
              maxWidth: '140px',
              padding: '4px',
              marginBottom: '2px'
            }}
          >
            <img
              src={message.media_path}
              alt="Sticker"
              loading="lazy"
              style={{ width: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
        {!message.media_path && message.type === 'sticker' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderRadius: '6px',
            marginBottom: cleanContent ? '6px' : '2px',
            border: '1px dashed rgba(128, 128, 128, 0.2)'
          }}>
            <Sparkles size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Sticker (Not included in export)
            </span>
          </div>
        )}

        {/* 4. Video */}
        {message.media_path && message.type === 'video' && (
          <div 
            onClick={() => onOpenMedia({ url: message.media_path!, type: 'video', name: message.media_name || 'Video' })}
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: '6px',
              overflow: 'hidden',
              maxHeight: '340px',
              marginBottom: cleanContent ? '6px' : '2px',
              backgroundColor: '#000000'
            }}
          >
            <video
              src={message.media_path}
              style={{ width: '100%', maxHeight: '340px', display: 'block' }}
              preload="metadata"
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.35)'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                border: '2px solid #ffffff'
              }}>
                <VideoIcon size={24} />
              </div>
            </div>
          </div>
        )}
        {!message.media_path && message.type === 'video' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            marginBottom: cleanContent ? '6px' : '2px',
            minWidth: '180px',
            border: '1px dashed rgba(128, 128, 128, 0.25)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <VideoIcon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Video
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Not included in export
              </div>
            </div>
          </div>
        )}

        {/* 5. Document / PDF */}
        {message.media_path && message.type === 'document' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.07)',
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: cleanContent ? '6px' : '2px',
            minWidth: '220px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--wa-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={20} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {message.media_name || 'Document'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {formatFileSize(message.media_size)}
              </div>
            </div>

            <a
              href={message.media_path}
              download={message.media_name || 'document'}
              style={{
                color: 'var(--text-secondary)',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.06)'
              }}
            >
              <Download size={16} />
            </a>
          </div>
        )}
        {!message.media_path && message.type === 'document' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            marginBottom: cleanContent ? '6px' : '2px',
            minWidth: '220px',
            border: '1px dashed rgba(128, 128, 128, 0.25)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.08)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {message.media_name || 'Document'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Not included in export
              </div>
            </div>
          </div>
        )}

        {/* 6. Contact / vCard */}
        {message.type === 'vcard' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.06)',
            borderRadius: '6px',
            marginBottom: '4px',
            minWidth: '200px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--wa-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserIcon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {message.media_name ? message.media_name.replace(/\.vcf$/i, '') : 'Contact'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {message.media_path ? 'Contact Card (vCard)' : 'Contact Card (Not included in export)'}
              </div>
            </div>
            {message.media_path && (
              <a 
                href={message.media_path} 
                download={message.media_name || 'contact.vcf'} 
                title="Download contact"
                style={{ 
                  color: 'var(--wa-primary)',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Download size={16} />
              </a>
            )}
          </div>
        )}

        {/* Message Text Content */}
        {cleanContent && (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {renderFormattedContent(cleanContent)}
          </div>
        )}

        {/* Time Stamp, Edited Indicator & Status Read Receipt */}
        <div style={{
          float: 'right',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: 'var(--text-bubble-time)',
          marginTop: '2px',
          marginLeft: '8px',
          userSelect: 'none'
        }}>
          {isEdited && (
            <span 
              title="This message was edited in WhatsApp (تم تعديل هذه الرسالة)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '10px',
                fontStyle: 'italic',
                color: 'var(--text-bubble-time)',
                opacity: 0.85
              }}
            >
              <Pencil size={9} />
              <span>Edited</span>
            </span>
          )}
          <span>{formatTime(message.time_str, message.date_str)}</span>
          {isOutgoing && (
            <CheckCheck size={15} color="var(--wa-blue-tick)" />
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.isGroup === nextProps.isGroup &&
    prevProps.message.is_me === nextProps.message.is_me &&
    prevProps.message.sender_name === nextProps.message.sender_name &&
    prevProps.message.sender_color === nextProps.message.sender_color
  );
});

import { MessageType, ParsedMessage } from './types.js';

// WhatsApp Participant Colors
export const PARTICIPANT_COLORS = [
  '#008069', // WhatsApp Teal
  '#1f7a8c', // Deep Sky Blue
  '#e76f51', // Burnt Sienna
  '#2a9d8f', // Persian Green
  '#7209b7', // Grape Purple
  '#e63946', // Coral Red
  '#4361ee', // Royal Blue
  '#3a0ca3', // Deep Indigo
  '#f77f00', // Amber Orange
  '#0077b6', // Pacific Blue
  '#d62828', // Crimson
  '#6b705c', // Olive Slate
  '#b5179e', // Magenta
  '#38b000', // Apple Green
];

// Normalize Eastern Arabic (٠-٩) and Persian/Urdu (۰-۹) numerals to standard ASCII digits (0-9)
export function normalizeEasternNumerals(str: string): string {
  return str
    .replace(/[\u0660\u06F0]/g, '0')
    .replace(/[\u0661\u06F1]/g, '1')
    .replace(/[\u0662\u06F2]/g, '2')
    .replace(/[\u0663\u06F3]/g, '3')
    .replace(/[\u0664\u06F4]/g, '4')
    .replace(/[\u0665\u06F5]/g, '5')
    .replace(/[\u0666\u06F6]/g, '6')
    .replace(/[\u0667\u06F7]/g, '7')
    .replace(/[\u0668\u06F8]/g, '8')
    .replace(/[\u0669\u06F9]/g, '9');
}

// Clean invisible Unicode control characters (LTR, RTL marks, embeddings, non-breaking spaces)
export function cleanText(str: string): string {
  return str
    .replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069\u00a0\u202f\ufeff]/g, '')
    .trim();
}

// Auto-detect and fix latin1 / mojibake UTF-8 decoding issues for uploaded filenames and titles
export function decodeUtf8IfNeeded(str: string): string {
  if (!str) return '';
  try {
    const converted = Buffer.from(str, 'latin1').toString('utf8');
    // If the converted string successfully decoded UTF-8 multi-byte characters (Arabic, Cyrillic, accented Latin, CJK)
    // and the original string had typical latin1 mojibake characters like Ø, Ù, etc., return the converted string
    if (/[ØÙÚÛ]/.test(str) && /[\u0600-\u06FF\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FFF]/.test(converted)) {
      return converted.normalize('NFC');
    }
  } catch {}
  return str.normalize('NFC');
}

// Media file extension to message type mapping
export function detectMediaType(filename: string): MessageType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'heic', 'webp'].includes(ext)) {
    if (ext === 'webp') return 'sticker';
    return 'image';
  }
  if (['mp4', 'mov', '3gp', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['opus', 'ogg', 'm4a', 'aac'].includes(ext)) return 'voice';
  if (['mp3', 'wav', 'flac'].includes(ext)) return 'audio';
  if (['vcf'].includes(ext)) return 'vcard';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'csv', 'dwg', 'dxf', 'ai', 'psd', 'cdr', 'rtf'].includes(ext)) return 'document';
  return 'document';
}

// Check if a line is a system event (in English or Arabic)
export function isSystemEvent(text: string): boolean {
  const clean = text.toLowerCase();
  return (
    // English system events
    clean.includes('messages and calls are end-to-end encrypted') ||
    clean.includes('end-to-end encrypted') ||
    clean.includes('created group') ||
    clean.includes('created this group') ||
    clean.includes('added') ||
    clean.includes('joined using this group\'s invite link') ||
    clean.includes('left') ||
    clean.includes('removed') ||
    clean.includes('changed the subject to') ||
    clean.includes('changed this group\'s icon') ||
    clean.includes('changed the group description') ||
    clean.includes('security code changed') ||
    clean.includes('changed their phone number') ||
    clean.includes('missed voice call') ||
    clean.includes('missed video call') ||
    clean.includes('missed group call') ||
    clean.includes('this message was deleted') ||
    clean.includes('you deleted this message') ||
    // Arabic system events
    clean.includes('مشفرة تمامًا') ||
    clean.includes('مشفرة تماما') ||
    clean.includes('أنشأ مجموعة') ||
    clean.includes('أنشأت مجموعة') ||
    clean.includes('غيّر اسم المجموعة') ||
    clean.includes('غيرت اسم المجموعة') ||
    clean.includes('غيّر أيقونة هذه المجموعة') ||
    clean.includes('أيقونة هذه المجموعة') ||
    clean.includes('غيّر وصف المجموعة') ||
    clean.includes('وصف هذه المجموعة') ||
    clean.includes('تمت إضافتك') ||
    clean.includes('أضاف') ||
    clean.includes('أضافت') ||
    clean.includes('انضم عبر رابط الدعوة') ||
    clean.includes('انضمت عبر رابط الدعوة') ||
    clean.includes('غادر') ||
    clean.includes('غادرت') ||
    clean.includes('تمت إزالة') ||
    clean.includes('تم حذف هذه الرسالة') ||
    clean.includes('حذفت هذه الرسالة') ||
    clean.includes('مكالمة صوتية فائتة') ||
    clean.includes('مكالمة فيديو فائتة') ||
    clean.includes('تم تغيير رمز الأمان')
  );
}

// Parse date string to timestamp
export function parseDateTime(dateStr: string, timeStr: string): { timestamp: number; standardizedDate: string; standardizedTime: string } {
  // Normalize date separators (. or - to /)
  const cleanDate = dateStr.replace(/[\.\-]/g, '/');
  const dateParts = cleanDate.split('/').map(p => parseInt(p, 10));

  let day = 1;
  let month = 1;
  let year = 2024;

  if (dateParts.length === 3) {
    // Check if format is YYYY/MM/DD or DD/MM/YYYY or MM/DD/YYYY
    if (dateParts[0] > 1000) {
      // YYYY/MM/DD
      year = dateParts[0];
      month = dateParts[1];
      day = dateParts[2];
    } else {
      // DD/MM/YY or MM/DD/YY
      let p1 = dateParts[0];
      let p2 = dateParts[1];
      let p3 = dateParts[2];
      if (p3 < 100) p3 += 2000;
      year = p3;

      // Heuristic: If first part > 12, it must be DD/MM/YY
      if (p1 > 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        // MM/DD/YY
        month = p1;
        day = p2;
      } else {
        // Default standard DD/MM/YYYY
        day = p1;
        month = p2;
      }
    }
  }

  // Parse time (e.g. 14:30:15 or 2:30 PM or 7:20 م or 10:15 ص)
  let cleanTime = timeStr.trim();
  let isPM = /pm|\u0645/i.test(cleanTime); // Arabic 'م' = PM
  let isAM = /am|\u0635/i.test(cleanTime); // Arabic 'ص' = AM
  cleanTime = cleanTime.replace(/[a-zA-Z\u0645\u0635\s]/g, '');
  const timeParts = cleanTime.split(':').map(p => parseInt(p, 10));

  let hours = timeParts[0] || 0;
  let minutes = timeParts[1] || 0;
  let seconds = timeParts[2] || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const dateObj = new Date(Date.UTC(year, Math.max(0, month - 1), day, hours, minutes, seconds));
  const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const standardizedDate = `${year}-${formattedMonth}-${formattedDay}`;

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMins = String(minutes).padStart(2, '0');
  const standardizedTime = `${formattedHours}:${formattedMins}`;

  return { timestamp, standardizedDate, standardizedTime };
}

export function parseChatLog(rawContent: string): {
  messages: ParsedMessage[];
  participants: Set<string>;
  source: 'ios' | 'android' | 'unknown';
  subject?: string;
} {
  const lines = rawContent.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  const participants = new Set<string>();
  let detectedSource: 'ios' | 'android' | 'unknown' = 'unknown';
  let inferredSubject: string | null = null;

  // Regular expressions for line matching with multi-language and Arabic support:
  // Supports commas: ',' or Arabic comma '،' (\u060C)
  // Supports AM/PM: 'AM', 'PM', 'am', 'pm', 'ص' (\u0635), 'م' (\u0645)
  // iOS format: [12/05/2023, 14:30:15] Sender Name: Message
  const iosRegex = /^\[(\d{1,4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,4})[,\u060C]?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[APap][Mm]|\u0635|\u0645))?)\]\s*(.*?)(?::\s*(.*))?$/;

  // Android format: 12/05/2023, 14:30 - Sender Name: Message
  const androidRegex = /^(\d{1,4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,4})[,\u060C]?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[APap][Mm]|\u0635|\u0645))?)\s*-\s*(.*?)(?::\s*(.*))?$/;

  let currentMsg: ParsedMessage | null = null;

  function finalizeMessage(msg: ParsedMessage) {
    if (!msg || msg.isSystem) return;

    // Check if multiline message ends with an omitted media phrase or document reference
    const cleaned = cleanText(msg.content);

    const docOmittedMatch = cleaned.match(/^([\s\S]*?\.([a-zA-Z0-9]{2,5}))(?:\s*•\s*[^\n\r]+?)?\s*(?:document omitted|<document omitted>|مستند مستبعد|تم استبعاد المستند)\s*$/i);
    const audioOmitted = cleaned.match(/^([\s\S]*?)(?:‎)?(?:audio omitted|<audio omitted>|voice note omitted|<voice note omitted>|صوت مستبعد|تم استبعاد الصوت|تم استبعاد التسجيل الصوتي)\s*$/i);
    const imgOmitted = cleaned.match(/^([\s\S]*?)(?:‎)?(?:image omitted|<image omitted>|photo omitted|<photo omitted>|صورة مستبعدة|تم استبعاد الصورة|GIF omitted|<GIF omitted>)\s*$/i);
    const vidOmitted = cleaned.match(/^([\s\S]*?)(?:‎)?(?:video omitted|<video omitted>|فيديو مستبعد|تم استبعاد مقطع الفيديو|تم استبعاد الفيديو)\s*$/i);
    const stickerOmitted = cleaned.match(/^([\s\S]*?)(?:‎)?(?:sticker omitted|<sticker omitted>|ملصق مستبعد|تم استبعاد الملصق)\s*$/i);
    const contactOmitted = cleaned.match(/^([\s\S]*?)(?:‎)?(?:contact card omitted|<contact card omitted>|contact omitted|<contact omitted>|تم استبعاد جهة الاتصال|تم استبعاد جهات الاتصال)\s*$/i);

    if (docOmittedMatch && !msg.mediaName) {
      msg.mediaName = docOmittedMatch[1].trim();
      msg.type = detectMediaType(msg.mediaName) || 'document';
      msg.content = '';
    } else if (imgOmitted && msg.type === 'text') {
      msg.type = 'image';
      msg.content = imgOmitted[1].trim();
    } else if (vidOmitted && msg.type === 'text') {
      msg.type = 'video';
      msg.content = vidOmitted[1].trim();
    } else if (audioOmitted && msg.type === 'text') {
      msg.type = 'voice';
      msg.content = audioOmitted[1].trim();
    } else if (stickerOmitted && msg.type === 'text') {
      msg.type = 'sticker';
      msg.content = stickerOmitted[1].trim();
    } else if (contactOmitted && msg.type === 'text') {
      msg.type = 'vcard';
      msg.content = contactOmitted[1].trim();
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const cleanedLine = cleanText(rawLine);
    if (!cleanedLine) continue;

    const normalizedLine = normalizeEasternNumerals(cleanedLine);
    let match = normalizedLine.match(iosRegex);

    if (match) {
      if (detectedSource === 'unknown') detectedSource = 'ios';
    } else {
      match = normalizedLine.match(androidRegex);
      if (match && detectedSource === 'unknown') detectedSource = 'android';
    }

    if (match) {
      // If we have an existing message in progress, finalize and push it
      if (currentMsg) {
        finalizeMessage(currentMsg);
        messages.push(currentMsg);
        currentMsg = null;
      }

      const datePart = match[1];
      const timePart = match[2];
      let senderPart = match[3] ? cleanText(match[3]) : null;
      let contentPart = match[4] !== undefined ? cleanText(match[4]) : '';

      const { timestamp, standardizedDate, standardizedTime } = parseDateTime(datePart, timePart);

      // Check if this is a system message (no separate sender, or sender text is the system event)
      if (match[4] === undefined || !senderPart || isSystemEvent(senderPart) || isSystemEvent(cleanedLine)) {
        const sysContent = (senderPart ? senderPart + (contentPart ? ': ' + contentPart : '') : contentPart) || cleanedLine;
        
        // Check for group subject creation or rename events
        const subjMatch1 = sysContent.match(/(?:changed the subject to|changed the subject from .*? to|created group|created this group)\s*["“'«](.*?)["”'»]/i);
        const subjMatch2 = sysContent.match(/(?:غيّر اسم المجموعة إلى|غيرت اسم المجموعة إلى|غيّر اسم المجموعة الى|غيرت اسم المجموعة الى|أنشأ مجموعة|أنشأت مجموعة|غيّر الموضوع إلى|غيّر الموضوع الى)\s*["“'«](.*?)["”'»]/i);
        if (subjMatch1 && subjMatch1[1].trim()) {
          inferredSubject = decodeUtf8IfNeeded(subjMatch1[1].trim());
        } else if (subjMatch2 && subjMatch2[1].trim()) {
          inferredSubject = decodeUtf8IfNeeded(subjMatch2[1].trim());
        }

        currentMsg = {
          dateStr: standardizedDate,
          timeStr: standardizedTime,
          timestamp,
          sender: null,
          content: sysContent,
          type: 'system',
          mediaName: null,
          isSystem: true
        };
      } else {
        // Valid user message
        participants.add(senderPart);

        // Check for attached media
        let mediaName: string | null = null;
        let msgType: MessageType = 'text';

        // 1. iOS attached pattern: <attached: 00000001-PHOTO-2023-05-12-14-32-10.jpg>
        const iosAttached = contentPart.match(/<attached:\s*([^>]+)>/i);
        // 2. Android attached pattern: e.g. "IMG-20230815-WA0001.jpg (file attached)" or "(الملف مرفق)"
        const androidAttached = contentPart.match(/^(.*?)\s*\((?:file attached|الملف مرفق|ملف مرفق)\)/i);
        // 3. Document with filename and omitted notice: e.g. "Emar Guide.pdf • 36 pages document omitted" or "plan.dwg document omitted"
        const docOmittedMatch = contentPart.match(/^(.*?\.([a-zA-Z0-9]{2,5}))(?:\s*•\s*[^\n\r]+?)?\s*(?:document omitted|<document omitted>|مستند مستبعد|تم استبعاد المستند)\s*$/i);
        // 4. Generic attached filename ending with known extension
        const genericAttached = contentPart.match(/^([^\n\r]+?\.(jpg|jpeg|png|webp|mp4|mov|3gp|opus|m4a|mp3|ogg|wav|pdf|doc|docx|xls|xlsx|ppt|pptx|vcf|zip|dwg|dxf))\b/i);

        if (iosAttached) {
          mediaName = iosAttached[1].trim();
          msgType = detectMediaType(mediaName);
          contentPart = contentPart.replace(/<attached:\s*[^>]+>/i, '').trim();
        } else if (androidAttached) {
          mediaName = androidAttached[1].trim();
          msgType = detectMediaType(mediaName);
          contentPart = contentPart.replace(/^(.*?)\s*\((?:file attached|الملف مرفق|ملف مرفق)\)/i, '').trim();
        } else if (docOmittedMatch) {
          mediaName = docOmittedMatch[1].trim();
          msgType = detectMediaType(mediaName) || 'document';
          contentPart = '';
        } else if (genericAttached && (contentPart.includes('(file attached)') || contentPart.includes('الملف مرفق') || contentPart.includes('ملف مرفق') || contentPart.length < 150)) {
          mediaName = genericAttached[1].trim();
          msgType = detectMediaType(mediaName);
          contentPart = contentPart.replace(genericAttached[0], '').trim();
        } else {
          // WhatsApp Desktop / iOS / Android omitted tags without explicit filenames
          const audioOmitted = contentPart.match(/^(.*?)(?:‎)?(?:audio omitted|<audio omitted>|voice note omitted|<voice note omitted>|صوت مستبعد|تم استبعاد الصوت|تم استبعاد التسجيل الصوتي)\s*$/i);
          const imgOmitted = contentPart.match(/^(.*?)(?:‎)?(?:image omitted|<image omitted>|photo omitted|<photo omitted>|صورة مستبعدة|تم استبعاد الصورة)\s*$/i);
          const vidOmitted = contentPart.match(/^(.*?)(?:‎)?(?:video omitted|<video omitted>|فيديو مستبعد|تم استبعاد مقطع الفيديو|تم استبعاد الفيديو)\s*$/i);
          const stickerOmitted = contentPart.match(/^(.*?)(?:‎)?(?:sticker omitted|<sticker omitted>|ملصق مستبعد|تم استبعاد الملصق)\s*$/i);
          const contactOmitted = contentPart.match(/^(.*?)(?:‎)?(?:contact card omitted|<contact card omitted>|contact omitted|<contact omitted>|تم استبعاد جهة الاتصال|تم استبعاد جهات الاتصال)\s*$/i);
          const gifOmitted = contentPart.match(/^(.*?)(?:‎)?(?:gif omitted|<gif omitted>)\s*$/i);
          const generalMediaOmitted = contentPart.match(/^(.*?)(?:‎)?(?:<Media omitted>|media omitted|تم استبعاد الوسائط|<تم استبعاد الوسائط>)\s*$/i);

          if (audioOmitted) {
            msgType = 'voice';
            contentPart = audioOmitted[1].trim();
          } else if (imgOmitted) {
            msgType = 'image';
            contentPart = imgOmitted[1].trim();
          } else if (vidOmitted) {
            msgType = 'video';
            contentPart = vidOmitted[1].trim();
          } else if (stickerOmitted) {
            msgType = 'sticker';
            contentPart = stickerOmitted[1].trim();
          } else if (contactOmitted) {
            msgType = 'vcard';
            contentPart = contactOmitted[1].trim();
          } else if (gifOmitted) {
            msgType = 'image';
            contentPart = gifOmitted[1].trim();
          } else if (generalMediaOmitted) {
            msgType = 'image';
            contentPart = generalMediaOmitted[1].trim();
          }
        }

        // Clean any leftover attached/omitted statements
        contentPart = contentPart
          .replace(/\((?:file attached|الملف مرفق|ملف مرفق)\)/gi, '')
          .replace(/<Media omitted>/gi, '')
          .trim();

        // If contentPart is just the media filename or omitted notice, clear it
        if (mediaName && contentPart === mediaName) {
          contentPart = '';
        }

        // Call event detection
        if (contentPart.includes('Missed voice call') || contentPart.includes('Missed video call') || contentPart.includes('مكالمة صوتية فائتة') || contentPart.includes('مكالمة فيديو فائتة')) {
          msgType = 'call';
        }

        currentMsg = {
          dateStr: standardizedDate,
          timeStr: standardizedTime,
          timestamp,
          sender: senderPart,
          content: contentPart,
          type: msgType,
          mediaName,
          isSystem: false
        };
      }
    } else {
      // Multiline message continuation
      if (currentMsg) {
        currentMsg.content += '\n' + rawLine;
      }
    }
  }

  if (currentMsg) {
    finalizeMessage(currentMsg);
    messages.push(currentMsg);
  }

  return {
    messages,
    participants,
    source: detectedSource,
    subject: inferredSubject || undefined
  };
}

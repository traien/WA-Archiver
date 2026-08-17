import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { initDatabase, getDb, saveDatabaseToDisk, dbOps, DATA_DIR, MEDIA_DIR, DB_PATH } from './db.js';
import { parseChatLog, PARTICIPANT_COLORS, detectMediaType, cleanText, decodeUtf8IfNeeded } from './parser.js';
import { ADMIN_USERNAME, ADMIN_PASSWORD, generateToken, revokeToken, authMiddleware } from './auth.js';
import { Chat, Participant, Message } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve media files directly from physical disk at /media/
app.use('/media', express.static(MEDIA_DIR));

// Configure Multer for zip uploads
const uploadDir = path.join(DATA_DIR, 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// ================= AUTH ROUTES =================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateToken(username);
    res.json({ success: true, token, username });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokeToken(authHeader.split(' ')[1]);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({ authenticated: true, username: ADMIN_USERNAME });
    return;
  }
  res.status(401).json({ authenticated: false });
});

// ================= CHATS ROUTES =================
app.get('/api/chats', authMiddleware, (_req: Request, res: Response) => {
  try {
    const chats = dbOps.getAllChats();
    res.json({ chats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const chat = dbOps.getChatById(chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    const participants = dbOps.getParticipants(chatId);
    res.json({ chat, participants });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/chats/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const { name, type } = req.body;
    dbOps.updateChat(chatId, { name, type });
    const updated = dbOps.getChatById(chatId);
    res.json({ chat: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    dbOps.deleteChat(chatId);
    res.json({ success: true, message: 'Chat deleted from database and disk' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CHAT UPLOAD & PROCESSING =================
app.post('/api/chats/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No export ZIP file provided' });
    return;
  }

  const uploadedFilePath = req.file.path;
  const rawUploadedName = (req.body && req.body.filename) || req.file.originalname;
  const originalFileName = decodeUtf8IfNeeded(rawUploadedName);
  const chatId = `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const targetMediaDir = path.join(MEDIA_DIR, chatId);

  try {
    fs.mkdirSync(targetMediaDir, { recursive: true });

    // Open Zip with AdmZip
    const zip = new AdmZip(uploadedFilePath);
    const zipEntries = zip.getEntries();

    let chatTextContent = '';
    let chatFileName = '';
    let extractedMediaCount = 0;

    // First, find the chat text file (_chat.txt or *.txt)
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const lowerName = entry.entryName.toLowerCase();
      if (lowerName === '_chat.txt' || lowerName.endsWith('/_chat.txt') || (!chatTextContent && lowerName.endsWith('.txt'))) {
        chatTextContent = entry.getData().toString('utf8');
        chatFileName = path.basename(decodeUtf8IfNeeded(entry.entryName));
      }
    }

    if (!chatTextContent) {
      // Clean up and return error
      fs.rmSync(targetMediaDir, { recursive: true, force: true });
      fs.unlinkSync(uploadedFilePath);
      res.status(400).json({ error: 'Could not find a valid WhatsApp chat .txt file inside the ZIP archive.' });
      return;
    }

    // Extract all media files directly to physical disk in ./data/media/<chatId>/
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const baseName = path.basename(decodeUtf8IfNeeded(entry.entryName));
      if (baseName.toLowerCase().endsWith('.txt')) continue; // Skip text logs

      const targetPath = path.join(targetMediaDir, baseName);
      fs.writeFileSync(targetPath, entry.getData());
      extractedMediaCount++;
    }

    // Parse chat log
    const parsed = parseChatLog(chatTextContent);

    // Auto-detect chat title
    const cleanPrefix = (str: string) => {
      if (!str) return '';
      const fixed = decodeUtf8IfNeeded(str);
      return fixed
        .replace(/[\u200e\u200f\u202a\u202b\u202c\u202d\u202e\ufeff]/g, '')
        .replace(/\.zip$/i, '')
        .replace(/\.txt$/i, '')
        .replace(/^WhatsApp Chat - /i, '')
        .replace(/^WhatsApp Chat with /i, '')
        .replace(/^دردشة في واتساب مع /i, '')
        .replace(/^دردشة واتساب مع /i, '')
        .replace(/^دردشة واتساب - /i, '')
        .trim();
    };

    let inferredTitle = cleanPrefix(originalFileName);
    if (parsed.subject) {
      inferredTitle = parsed.subject;
    } else if (!inferredTitle || inferredTitle.toLowerCase() === 'whatsapp chat' || inferredTitle.toLowerCase() === 'chat') {
      if (chatFileName) {
        inferredTitle = cleanPrefix(chatFileName);
      }
    }
    if (!inferredTitle) inferredTitle = 'WhatsApp Conversation';

    // Auto-detect type: Group vs Personal
    const participantCount = parsed.participants.size;
    const isGroup = participantCount > 2 || /group/i.test(inferredTitle) || /team/i.test(inferredTitle);
    const chatType = (req.body.type as any) || (isGroup ? 'group' : 'personal');

    const dateStart = parsed.messages.length > 0 ? parsed.messages[0].dateStr : null;
    const dateEnd = parsed.messages.length > 0 ? parsed.messages[parsed.messages.length - 1].dateStr : null;

    // Create Chat Record
    const chatRecord: Chat = {
      id: chatId,
      name: inferredTitle,
      type: chatType,
      created_at: Date.now(),
      message_count: parsed.messages.length,
      media_count: extractedMediaCount,
      date_start: dateStart,
      date_end: dateEnd,
      export_source: parsed.source
    };

    dbOps.createChat(chatRecord);

    // Match unlinked media files (photos, videos, voice notes, stickers, vcards, docs)
    const allExtractedFiles = fs.readdirSync(targetMediaDir).filter(f => !f.endsWith('.txt'));
    const linkedMediaNames = new Set(parsed.messages.filter(m => m.mediaName).map(m => m.mediaName));

    for (const fn of allExtractedFiles) {
      if (linkedMediaNames.has(fn)) continue;

      const cleanFn = cleanText(fn).normalize('NFC');
      const fileType = detectMediaType(fn);

      // 1. Direct name match against existing message mediaName (accounting for Unicode normalization)
      let candidate = parsed.messages.find(m =>
        m.mediaName && cleanText(m.mediaName).normalize('NFC') === cleanFn
      );

      if (!candidate) {
        // 2. Extract timestamp from filename:
        // e.g. "00000001-AUDIO-2026-08-14-11-55-22.opus" or "-0000006-AUDIO-2026-08-01-11-35-22.opus"
        const dtMatch = fn.match(/(\d{4})[-_](\d{2})[-_](\d{2})[-_](\d{2})[-_](\d{2})(?:[-_](\d{2}))?/);
        const dMatch = fn.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);

        let targetDate = '';
        let targetTime = '';
        let fileTs = 0;

        if (dtMatch) {
          targetDate = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
          targetTime = `${dtMatch[4]}:${dtMatch[5]}`;
          const sec = parseInt(dtMatch[6] || '0', 10);
          fileTs = new Date(Date.UTC(parseInt(dtMatch[1], 10), parseInt(dtMatch[2], 10) - 1, parseInt(dtMatch[3], 10), parseInt(dtMatch[4], 10), parseInt(dtMatch[5], 10), sec)).getTime();
        } else if (dMatch) {
          targetDate = `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
        }

        // 2a. Match by exact date + time + type
        if (targetDate && targetTime) {
          candidate = parsed.messages.find(m =>
            m.dateStr === targetDate &&
            m.timeStr === targetTime &&
            (m.type === fileType || (fileType === 'voice' && m.type === 'audio') || (fileType === 'audio' && m.type === 'voice') || m.type === 'text') &&
            !m.mediaName
          );
        }

        // 2b. Match by timestamp proximity (within 2 minutes on same date)
        if (!candidate && targetDate && fileTs > 0) {
          candidate = parsed.messages.find(m =>
            m.dateStr === targetDate &&
            Math.abs(m.timestamp - fileTs) < 120000 &&
            (m.type === fileType || (fileType === 'voice' && m.type === 'audio') || (fileType === 'audio' && m.type === 'voice') || m.type === 'text') &&
            !m.mediaName
          );
        }

        // 2c. Match by date on same date with matching media type
        if (!candidate && targetDate) {
          candidate = parsed.messages.find(m =>
            m.dateStr === targetDate &&
            (m.type === fileType || (fileType === 'voice' && m.type === 'audio') || (fileType === 'audio' && m.type === 'voice')) &&
            !m.mediaName
          );
        }
      }

      if (candidate) {
        candidate.mediaName = fn;
        candidate.type = fileType;
        candidate.content = candidate.content.replace(/<Media omitted>/gi, '').trim();
        linkedMediaNames.add(fn);
      }
    }

    // Save Participants
    const participantMap = new Map<string, Participant>();
    let colorIdx = 0;

    for (const pName of parsed.participants) {
      const pId = `p_${chatId}_${crypto.randomBytes(4).toString('hex')}`;
      const color = PARTICIPANT_COLORS[colorIdx % PARTICIPANT_COLORS.length];
      colorIdx++;

      const isPhone = /^\+?[0-9\s\-()]+$/.test(pName);
      const participant: Participant = {
        id: pId,
        chat_id: chatId,
        raw_name: pName,
        display_name: pName,
        phone_number: isPhone ? pName : '',
        is_me: 0,
        color,
        notes: ''
      };
      dbOps.insertParticipant(participant);
      participantMap.set(pName, participant);
    }

    // Save Messages using batch SQL statements
    const db = getDb();
    db.run('BEGIN TRANSACTION');

    for (let i = 0; i < parsed.messages.length; i++) {
      const m = parsed.messages[i];
      const msgId = `m_${chatId}_${i + 1}`;
      const pObj = m.sender ? participantMap.get(m.sender) : null;

      let mediaPath: string | null = null;
      let mediaSize: number | null = null;

      if (m.mediaName) {
        const diskPath = path.join(targetMediaDir, m.mediaName);
        if (fs.existsSync(diskPath)) {
          mediaPath = `/media/${chatId}/${m.mediaName}`;
          try {
            mediaSize = fs.statSync(diskPath).size;
          } catch {}
        }
      }

      db.run(`
        INSERT INTO messages (id, chat_id, timestamp, date_str, time_str, sender_id, raw_sender, content, type, media_name, media_path, media_size, is_forwarded, quoted_text, quoted_sender, reactions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `, [
        msgId,
        chatId,
        m.timestamp,
        m.dateStr,
        m.timeStr,
        pObj ? pObj.id : null,
        m.sender,
        m.content,
        m.type,
        m.mediaName,
        mediaPath,
        mediaSize,
        m.quotedText || null,
        m.quotedSender || null,
        null
      ]);
    }

    db.run('COMMIT');
    saveDatabaseToDisk();

    // Clean up uploaded temp zip file
    fs.unlinkSync(uploadedFilePath);

    res.json({
      success: true,
      chat: chatRecord,
      participants: Array.from(participantMap.values()),
      messageCount: parsed.messages.length,
      mediaCount: extractedMediaCount
    });
  } catch (err: any) {
    if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    res.status(500).json({ error: 'Failed to process WhatsApp export: ' + err.message });
  }
});

// ================= PARTICIPANTS =================
app.patch('/api/chats/:chatId/participants/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.chatId);
    const participantId = String(req.params.id);
    const { display_name, phone_number, is_me, color, notes } = req.body;
    dbOps.updateParticipant(participantId, { display_name, phone_number, is_me, color, notes });
    if (is_me !== undefined) {
      dbOps.setParticipantIsMe(chatId, participantId, Boolean(is_me));
    }
    const participants = dbOps.getParticipants(chatId);
    res.json({ participants });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SETTINGS & STORAGE =================
app.post('/api/settings/apply-me-identity', authMiddleware, (req: Request, res: Response) => {
  try {
    const { identities } = req.body;
    if (!Array.isArray(identities)) {
      res.status(400).json({ error: 'Identities must be an array of names and phone numbers' });
      return;
    }
    const result = dbOps.applyMeIdentities(identities);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/storage', authMiddleware, (req: Request, res: Response) => {
  try {
    let dbSize = 0;
    if (fs.existsSync(DB_PATH)) {
      dbSize = fs.statSync(DB_PATH).size;
    }

    let mediaCount = 0;
    let mediaSize = 0;

    const getFolderStats = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          getFolderStats(full);
        } else {
          mediaCount++;
          try {
            mediaSize += fs.statSync(full).size;
          } catch {}
        }
      }
    };

    getFolderStats(MEDIA_DIR);

    res.json({
      dbPath: DB_PATH,
      dbSize,
      mediaDir: MEDIA_DIR,
      mediaCount,
      mediaSize
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= MESSAGES & SEARCH =================
app.get('/api/chats/:id/messages', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const beforeTimestamp = req.query.beforeTimestamp ? parseInt(String(req.query.beforeTimestamp), 10) : undefined;
    const afterTimestamp = req.query.afterTimestamp ? parseInt(String(req.query.afterTimestamp), 10) : undefined;
    const aroundId = req.query.aroundId ? String(req.query.aroundId) : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const senderId = req.query.senderId ? String(req.query.senderId) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const wholeWord = req.query.wholeWord === 'true' || req.query.wholeWord === '1';

    const result = dbOps.getMessages(chatId, {
      limit,
      offset,
      beforeTimestamp,
      afterTimestamp,
      aroundId,
      startDate,
      endDate,
      senderId,
      type,
      search,
      wholeWord
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:id/dates', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const dates = dbOps.getChatDates(chatId);
    res.json({ dates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:id/media', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const category = (req.query.category as any) || 'all';
    const media = dbOps.getChatMedia(chatId, category);
    res.json({ media });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:id/analytics', authMiddleware, (req: Request, res: Response) => {
  try {
    const chatId = String(req.params.id);
    const analytics = dbOps.getChatAnalytics(chatId);
    res.json({ analytics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend assets in production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/media')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Initialize SQLite database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[WhatsApp Viewer Server] Running at http://0.0.0.0:${PORT}`);
    console.log(`[Data Directory] Storing database & media in ${DATA_DIR}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

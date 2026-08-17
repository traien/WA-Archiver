import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Chat, Participant, Message, ChatAnalytics } from './types.js';
import { decodeUtf8IfNeeded } from './parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root data folder on physical disk
export const DATA_DIR = path.resolve(__dirname, '..', 'data');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
export const DB_PATH = path.join(DATA_DIR, 'whatsapp.db');

// Ensure directories exist on disk
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

let dbInstance: Database | null = null;

// Register custom SQLite scalar functions (e.g. whole-word matching)
export function registerCustomFunctions(db: Database) {
  if (!db) return;
  db.create_function('WHOLE_WORD_MATCH', (content: any, word: any) => {
    if (!content || !word) return 0;
    const wordStr = String(word).trim();
    if (!wordStr) return 0;
    const escaped = wordStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-])${escaped}([\\s.,!?;:()\\[\\]{}"'،؟«»/\\\\-]|$)`, 'i');
    return regex.test(String(content)) ? 1 : 0;
  });
}

// Helper to save SQLite file to physical disk
export function saveDatabaseToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    // Note: sql.js export() closes and reopens internal db, wiping custom functions
    registerCustomFunctions(dbInstance);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Could not read existing database file, creating fresh one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Performance PRAGMAs for high-speed indexing and caching
  dbInstance.run(`
    PRAGMA temp_store = MEMORY;
    PRAGMA cache_size = -64000;
  `);

  // Register custom functions on new database instance
  registerCustomFunctions(dbInstance);

  // Create SQLite tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      media_count INTEGER NOT NULL DEFAULT 0,
      date_start TEXT,
      date_end TEXT,
      export_source TEXT NOT NULL DEFAULT 'unknown'
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      raw_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone_number TEXT NOT NULL DEFAULT '',
      is_me INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      date_str TEXT NOT NULL,
      time_str TEXT NOT NULL,
      sender_id TEXT,
      raw_sender TEXT,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      media_name TEXT,
      media_path TEXT,
      media_size INTEGER,
      mime_type TEXT,
      is_forwarded INTEGER NOT NULL DEFAULT 0,
      quoted_text TEXT,
      quoted_sender TEXT,
      reactions TEXT,
      is_starred INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages (chat_id, timestamp ASC);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_date ON messages (chat_id, date_str);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_type ON messages (type);
    CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages (chat_id, is_starred);
    CREATE INDEX IF NOT EXISTS idx_participants_chat ON participants (chat_id);
  `);

  // Migration: add is_starred column to existing database if needed
  try {
    dbInstance.run('ALTER TABLE messages ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0');
  } catch (e) {
    // Column already exists
  }

  // Auto-repair any mojibake in existing chat titles and participants
  try {
    const chats = dbOps.getAllChats();
    let hasRepairs = false;
    for (const c of chats) {
      const fixedName = decodeUtf8IfNeeded(c.name);
      if (fixedName !== c.name) {
        dbOps.updateChat(c.id, { name: fixedName });
        hasRepairs = true;
      }
    }
    if (hasRepairs) {
      saveDatabaseToDisk();
    }
  } catch (e) {
    // Non-fatal if tables are empty or being initialized
  }

  saveDatabaseToDisk();
  return dbInstance;
}

export function getDb(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  // Ensure custom scalar functions exist in case sql.js export() re-opened the DB
  if (!(dbInstance as any).Sa || !(dbInstance as any).Sa['WHOLE_WORD_MATCH']) {
    registerCustomFunctions(dbInstance);
  }
  return dbInstance;
}

// Database helper functions
export const dbOps = {
  // Chats
  getAllChats(): (Chat & { participants_count: number; preview_message?: string; preview_time?: string })[] {
    const db = getDb();
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM participants WHERE chat_id = c.id) as participants_count,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as preview_message,
        (SELECT time_str FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as preview_time
      FROM chats c
      ORDER BY c.created_at DESC
    `;
    const stmt = db.prepare(query);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  getChatById(chatId: string): Chat | undefined {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM chats WHERE id = :id');
    stmt.bind({ ':id': chatId });
    let chat: Chat | undefined = undefined;
    if (stmt.step()) {
      chat = stmt.getAsObject() as unknown as Chat;
    }
    stmt.free();
    return chat;
  },

  createChat(chat: Chat) {
    const db = getDb();
    db.run(`
      INSERT INTO chats (id, name, type, created_at, message_count, media_count, date_start, date_end, export_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [chat.id, chat.name, chat.type, chat.created_at, chat.message_count, chat.media_count, chat.date_start, chat.date_end, chat.export_source]);
    saveDatabaseToDisk();
  },

  updateChat(chatId: string, updates: Partial<Pick<Chat, 'name' | 'type'>>) {
    const db = getDb();
    if (updates.name !== undefined) {
      db.run('UPDATE chats SET name = ? WHERE id = ?', [updates.name, chatId]);
    }
    if (updates.type !== undefined) {
      db.run('UPDATE chats SET type = ? WHERE id = ?', [updates.type, chatId]);
    }
    saveDatabaseToDisk();
  },

  deleteChat(chatId: string) {
    const db = getDb();
    // Delete files from disk first
    const chatMediaDir = path.join(MEDIA_DIR, chatId);
    if (fs.existsSync(chatMediaDir)) {
      fs.rmSync(chatMediaDir, { recursive: true, force: true });
    }

    db.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
    db.run('DELETE FROM participants WHERE chat_id = ?', [chatId]);
    db.run('DELETE FROM chats WHERE id = ?', [chatId]);
    saveDatabaseToDisk();
  },

  // Participants
  getParticipants(chatId: string): Participant[] {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM participants WHERE chat_id = ? ORDER BY is_me DESC, raw_name ASC');
    stmt.bind([chatId]);
    const results: Participant[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Participant);
    }
    stmt.free();
    return results;
  },

  insertParticipant(p: Participant) {
    const db = getDb();
    db.run(`
      INSERT INTO participants (id, chat_id, raw_name, display_name, phone_number, is_me, color, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [p.id, p.chat_id, p.raw_name, p.display_name, p.phone_number, p.is_me, p.color, p.notes || '']);
  },

  updateParticipant(id: string, updates: Partial<Pick<Participant, 'display_name' | 'phone_number' | 'is_me' | 'color' | 'notes'>>) {
    const db = getDb();
    if (updates.display_name !== undefined) db.run('UPDATE participants SET display_name = ? WHERE id = ?', [updates.display_name, id]);
    if (updates.phone_number !== undefined) db.run('UPDATE participants SET phone_number = ? WHERE id = ?', [updates.phone_number, id]);
    if (updates.is_me !== undefined) db.run('UPDATE participants SET is_me = ? WHERE id = ?', [updates.is_me, id]);
    if (updates.color !== undefined) db.run('UPDATE participants SET color = ? WHERE id = ?', [updates.color, id]);
    if (updates.notes !== undefined) db.run('UPDATE participants SET notes = ? WHERE id = ?', [updates.notes, id]);
    saveDatabaseToDisk();
  },

  applyMeIdentities(identities: string[]): { updatedCount: number; totalParticipants: number } {
    const db = getDb();
    if (!identities || identities.length === 0) return { updatedCount: 0, totalParticipants: 0 };

    const normalized = identities.map(s => s.trim().toLowerCase()).filter(Boolean);
    const cleanNumbers = identities.map(s => s.replace(/[\s\-\(\)\+]/g, '').trim()).filter(Boolean);

    const stmt = db.prepare('SELECT id, raw_name, display_name, phone_number, is_me FROM participants');
    const participants: any[] = [];
    while (stmt.step()) {
      participants.push(stmt.getAsObject());
    }
    stmt.free();

    let updatedCount = 0;
    db.run('BEGIN TRANSACTION');
    const updateStmt = db.prepare('UPDATE participants SET is_me = ? WHERE id = ?');

    for (const p of participants) {
      const rawLower = (p.raw_name || '').toLowerCase();
      const displayLower = (p.display_name || '').toLowerCase();
      const phoneClean = (p.phone_number || '').replace(/[\s\-\(\)\+]/g, '');

      let shouldBeMe = 0;
      for (const id of normalized) {
        if (rawLower === id || displayLower === id) {
          shouldBeMe = 1;
          break;
        }
      }
      if (!shouldBeMe && phoneClean) {
        for (const num of cleanNumbers) {
          if (num && phoneClean === num) {
            shouldBeMe = 1;
            break;
          }
        }
      }

      if (shouldBeMe === 1 && p.is_me !== 1) {
        updateStmt.bind([1, p.id]);
        updateStmt.step();
        updateStmt.reset();
        updatedCount++;
      }
    }
    updateStmt.free();
    db.run('COMMIT');
    saveDatabaseToDisk();

    return { updatedCount, totalParticipants: participants.length };
  },

  setParticipantIsMe(chatId: string, participantId: string, isMe: boolean) {
    const db = getDb();
    db.run('UPDATE participants SET is_me = ? WHERE id = ? AND chat_id = ?', [isMe ? 1 : 0, participantId, chatId]);
    saveDatabaseToDisk();
  },

  // Messages Query
  // Messages Query with High-Performance Cursor Pagination
  getMessages(chatId: string, options: {
    limit?: number;
    offset?: number;
    beforeTimestamp?: number;
    afterTimestamp?: number;
    aroundId?: string;
    startDate?: string;
    endDate?: string;
    senderId?: string;
    type?: string;
    search?: string;
    wholeWord?: boolean;
  } = {}): { 
    messages: (Message & { sender_name?: string; sender_color?: string; is_me?: number })[]; 
    total: number;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
  } {
    const db = getDb();
    const { 
      limit = 100, 
      offset = 0, 
      beforeTimestamp, 
      afterTimestamp, 
      aroundId,
      startDate, 
      endDate, 
      senderId, 
      type, 
      search,
      wholeWord
    } = options;

    // Special case: Load context around a specific message (e.g. from search jump)
    if (aroundId) {
      const targetStmt = db.prepare('SELECT timestamp FROM messages WHERE id = ? AND chat_id = ?');
      targetStmt.bind([aroundId, chatId]);
      let targetTs: number | null = null;
      if (targetStmt.step()) {
        targetTs = (targetStmt.getAsObject() as any).timestamp;
      }
      targetStmt.free();

      if (targetTs !== null) {
        const half = Math.floor(limit / 2);
        // Before target
        const beforeSql = `
          SELECT * FROM (
            SELECT m.*, p.display_name as sender_name, p.color as sender_color, p.is_me as is_me, p.phone_number as sender_phone
            FROM messages m
            LEFT JOIN participants p ON m.sender_id = p.id
            WHERE m.chat_id = ? AND m.timestamp < ?
            ORDER BY m.timestamp DESC
            LIMIT ?
          ) ORDER BY timestamp ASC
        `;
        const bStmt = db.prepare(beforeSql);
        bStmt.bind([chatId, targetTs, half]);
        const beforeList: any[] = [];
        while (bStmt.step()) beforeList.push(bStmt.getAsObject());
        bStmt.free();

        // Target and after
        const afterSql = `
          SELECT m.*, p.display_name as sender_name, p.color as sender_color, p.is_me as is_me, p.phone_number as sender_phone
          FROM messages m
          LEFT JOIN participants p ON m.sender_id = p.id
          WHERE m.chat_id = ? AND m.timestamp >= ?
          ORDER BY m.timestamp ASC
          LIMIT ?
        `;
        const aStmt = db.prepare(afterSql);
        aStmt.bind([chatId, targetTs, half + 1]);
        const afterList: any[] = [];
        while (aStmt.step()) afterList.push(aStmt.getAsObject());
        aStmt.free();

        const combined = [...beforeList, ...afterList];
        const oldestTs = combined.length > 0 ? combined[0].timestamp : null;
        const newestTs = combined.length > 0 ? combined[combined.length - 1].timestamp : null;

        let hasMoreBefore = false;
        let hasMoreAfter = false;

        if (oldestTs !== null) {
          const checkOlder = db.prepare('SELECT 1 FROM messages WHERE chat_id = ? AND timestamp < ? LIMIT 1');
          checkOlder.bind([chatId, oldestTs]);
          hasMoreBefore = checkOlder.step();
          checkOlder.free();
        }

        if (newestTs !== null) {
          const checkNewer = db.prepare('SELECT 1 FROM messages WHERE chat_id = ? AND timestamp > ? LIMIT 1');
          checkNewer.bind([chatId, newestTs]);
          hasMoreAfter = checkNewer.step();
          checkNewer.free();
        }

        return {
          messages: combined,
          total: combined.length,
          hasMoreBefore,
          hasMoreAfter
        };
      }
    }

    let whereClauses = ['m.chat_id = ?'];
    const params: any[] = [chatId];

    if (startDate) {
      whereClauses.push('m.date_str >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('m.date_str <= ?');
      params.push(endDate);
    }
    if (senderId) {
      whereClauses.push('m.sender_id = ?');
      params.push(senderId);
    }
    if (type && type !== 'all') {
      if (type === 'media') {
        whereClauses.push("m.type IN ('image', 'video', 'audio', 'voice', 'sticker', 'document')");
      } else if (type === 'voice') {
        whereClauses.push("m.type IN ('audio', 'voice')");
      } else {
        whereClauses.push('m.type = ?');
        params.push(type);
      }
    }
    if (search && search.trim()) {
      if (wholeWord) {
        whereClauses.push('(WHOLE_WORD_MATCH(m.content, ?) OR WHOLE_WORD_MATCH(m.raw_sender, ?))');
        params.push(search.trim(), search.trim());
      } else {
        whereClauses.push('(m.content LIKE ? OR m.raw_sender LIKE ?)');
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }
    }

    // Cursor conditions
    if (beforeTimestamp !== undefined) {
      whereClauses.push('m.timestamp < ?');
      params.push(beforeTimestamp);

      const whereSql = whereClauses.join(' AND ');
      const querySql = `
        SELECT * FROM (
          SELECT 
            m.*,
            p.display_name as sender_name,
            p.color as sender_color,
            p.is_me as is_me,
            p.phone_number as sender_phone
          FROM messages m
          LEFT JOIN participants p ON m.sender_id = p.id
          WHERE ${whereSql}
          ORDER BY m.timestamp DESC
          LIMIT ?
        ) ORDER BY timestamp ASC
      `;
      const queryStmt = db.prepare(querySql);
      queryStmt.bind([...params, limit]);
      const messages: any[] = [];
      while (queryStmt.step()) {
        messages.push(queryStmt.getAsObject());
      }
      queryStmt.free();

      return {
        messages,
        total: messages.length,
        hasMoreBefore: messages.length === limit,
        hasMoreAfter: true
      };
    }

    if (afterTimestamp !== undefined) {
      whereClauses.push('m.timestamp > ?');
      params.push(afterTimestamp);

      const whereSql = whereClauses.join(' AND ');
      const querySql = `
        SELECT 
          m.*,
          p.display_name as sender_name,
          p.color as sender_color,
          p.is_me as is_me,
          p.phone_number as sender_phone
        FROM messages m
        LEFT JOIN participants p ON m.sender_id = p.id
        WHERE ${whereSql}
        ORDER BY m.timestamp ASC
        LIMIT ?
      `;
      const queryStmt = db.prepare(querySql);
      queryStmt.bind([...params, limit]);
      const messages: any[] = [];
      while (queryStmt.step()) {
        messages.push(queryStmt.getAsObject());
      }
      queryStmt.free();

      return {
        messages,
        total: messages.length,
        hasMoreBefore: true,
        hasMoreAfter: messages.length === limit
      };
    }

    // Default: If no search or date filter is specified, fetch the latest N messages
    if (!startDate && !endDate && !search && !senderId && (!type || type === 'all')) {
      const whereSql = whereClauses.join(' AND ');
      const querySql = `
        SELECT * FROM (
          SELECT 
            m.*,
            p.display_name as sender_name,
            p.color as sender_color,
            p.is_me as is_me,
            p.phone_number as sender_phone
          FROM messages m
          LEFT JOIN participants p ON m.sender_id = p.id
          WHERE ${whereSql}
          ORDER BY m.timestamp DESC
          LIMIT ?
        ) ORDER BY timestamp ASC
      `;
      const queryStmt = db.prepare(querySql);
      queryStmt.bind([...params, limit]);
      const messages: any[] = [];
      while (queryStmt.step()) {
        messages.push(queryStmt.getAsObject());
      }
      queryStmt.free();

      return {
        messages,
        total: messages.length,
        hasMoreBefore: messages.length === limit,
        hasMoreAfter: false
      };
    }

    // Filtered / Searched query with standard offset
    const whereSql = whereClauses.join(' AND ');
    const querySql = `
      SELECT 
        m.*,
        p.display_name as sender_name,
        p.color as sender_color,
        p.is_me as is_me,
        p.phone_number as sender_phone
      FROM messages m
      LEFT JOIN participants p ON m.sender_id = p.id
      WHERE ${whereSql}
      ORDER BY m.timestamp ASC
      LIMIT ? OFFSET ?
    `;

    const queryStmt = db.prepare(querySql);
    queryStmt.bind([...params, limit, offset]);

    const messages: any[] = [];
    while (queryStmt.step()) {
      messages.push(queryStmt.getAsObject());
    }
    queryStmt.free();

    return { 
      messages, 
      total: messages.length,
      hasMoreBefore: offset > 0,
      hasMoreAfter: messages.length === limit
    };
  },

  // Get distinct dates with message count for calendar navigation
  getChatDates(chatId: string): { date: string; count: number }[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT date_str as date, COUNT(*) as count 
      FROM messages 
      WHERE chat_id = ? 
      GROUP BY date_str 
      ORDER BY date_str ASC
    `);
    stmt.bind([chatId]);
    const dates: { date: string; count: number }[] = [];
    while (stmt.step()) {
      dates.push(stmt.getAsObject() as any);
    }
    stmt.free();
    return dates;
  },

  // Media files categorized
  getChatMedia(chatId: string, category: 'images' | 'videos' | 'audio' | 'docs' | 'all' = 'all') {
    const db = getDb();
    let typeFilter = "m.media_path IS NOT NULL AND m.media_path != ''";
    if (category === 'images') typeFilter += " AND m.type IN ('image', 'sticker')";
    if (category === 'videos') typeFilter += " AND m.type = 'video'";
    if (category === 'audio') typeFilter += " AND m.type IN ('audio', 'voice')";
    if (category === 'docs') typeFilter += " AND m.type = 'document'";

    const stmt = db.prepare(`
      SELECT m.id, m.chat_id, m.timestamp, m.date_str, m.time_str, m.type, m.media_name, m.media_path, m.media_size, m.mime_type, m.raw_sender,
             p.display_name as sender_name
      FROM messages m
      LEFT JOIN participants p ON m.sender_id = p.id
      WHERE m.chat_id = ? AND ${typeFilter}
      ORDER BY m.timestamp DESC
    `);
    stmt.bind([chatId]);
    const media: any[] = [];
    while (stmt.step()) {
      media.push(stmt.getAsObject());
    }
    stmt.free();
    return media;
  },

  // Chat Analytics
  getChatAnalytics(chatId: string): ChatAnalytics {
    const db = getDb();
    const chat = dbOps.getChatById(chatId);
    const totalMessages = chat?.message_count || 0;
    const totalMedia = chat?.media_count || 0;

    // Date range from messages
    const dateRangeStmt = db.prepare('SELECT MIN(date_str) as minDate, MAX(date_str) as maxDate FROM messages WHERE chat_id = ?');
    dateRangeStmt.bind([chatId]);
    let minDate: string | null = null;
    let maxDate: string | null = null;
    if (dateRangeStmt.step()) {
      const row = dateRangeStmt.getAsObject() as any;
      minDate = row.minDate || null;
      maxDate = row.maxDate || null;
    }
    dateRangeStmt.free();

    // Participant Stats
    const pStmt = db.prepare(`
      SELECT 
        p.id,
        p.display_name as name,
        p.color,
        COUNT(m.id) as messageCount,
        SUM(LENGTH(m.content)) as charCount,
        SUM(CASE WHEN m.media_path IS NOT NULL AND m.media_path != '' THEN 1 ELSE 0 END) as mediaCount
      FROM participants p
      LEFT JOIN messages m ON m.sender_id = p.id AND m.chat_id = ?
      WHERE p.chat_id = ?
      GROUP BY p.id
      ORDER BY messageCount DESC
    `);
    pStmt.bind([chatId, chatId]);
    const pRows: any[] = [];
    while (pStmt.step()) {
      pRows.push(pStmt.getAsObject());
    }
    pStmt.free();

    let totalWords = 0;
    const participantStats = pRows.map(row => {
      const approxWords = Math.round((row.charCount || 0) / 5);
      totalWords += approxWords;
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        messageCount: row.messageCount || 0,
        wordCount: approxWords,
        mediaCount: row.mediaCount || 0,
        percentage: totalMessages > 0 ? Math.round(((row.messageCount || 0) / totalMessages) * 100) : 0
      };
    });

    // Activity by Hour
    const hourStmt = db.prepare(`
      SELECT CAST(strftime('%H', datetime(timestamp / 1000, 'unixepoch')) AS INTEGER) as hour, COUNT(*) as count
      FROM messages
      WHERE chat_id = ? AND type != 'system'
      GROUP BY hour
      ORDER BY hour ASC
    `);
    hourStmt.bind([chatId]);
    const hourRows: { hour: number; count: number }[] = [];
    while (hourStmt.step()) {
      hourRows.push(hourStmt.getAsObject() as any);
    }
    hourStmt.free();

    const activityByHour = Array.from({ length: 24 }, (_, h) => {
      const found = hourRows.find(r => r.hour === h);
      return { hour: h, count: found ? found.count : 0 };
    });

    // Activity by Day of Week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStmt = db.prepare(`
      SELECT CAST(strftime('%w', datetime(timestamp / 1000, 'unixepoch')) AS INTEGER) as day, COUNT(*) as count
      FROM messages
      WHERE chat_id = ? AND type != 'system'
      GROUP BY day
      ORDER BY day ASC
    `);
    dayStmt.bind([chatId]);
    const dayRows: { day: number; count: number }[] = [];
    while (dayStmt.step()) {
      dayRows.push(dayStmt.getAsObject() as any);
    }
    dayStmt.free();

    const activityByDayOfWeek = Array.from({ length: 7 }, (_, d) => {
      const found = dayRows.find(r => r.day === d);
      return { day: d, dayName: dayNames[d], count: found ? found.count : 0 };
    });

    // Media Breakdown
    const mbStmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as images,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as videos,
        SUM(CASE WHEN type IN ('audio', 'voice') THEN 1 ELSE 0 END) as audios,
        SUM(CASE WHEN type = 'sticker' THEN 1 ELSE 0 END) as stickers,
        SUM(CASE WHEN type = 'document' THEN 1 ELSE 0 END) as documents
      FROM messages
      WHERE chat_id = ?
    `);
    mbStmt.bind([chatId]);
    let mbRow: any = {};
    if (mbStmt.step()) {
      mbRow = mbStmt.getAsObject();
    }
    mbStmt.free();

    // Top emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
    const textStmt = db.prepare(`SELECT content FROM messages WHERE chat_id = ? AND type = 'text' LIMIT 2000`);
    textStmt.bind([chatId]);
    const emojiCounts: Record<string, number> = {};
    while (textStmt.step()) {
      const content = (textStmt.getAsObject() as any).content || '';
      const matches = content.match(emojiRegex);
      if (matches) {
        for (const em of matches) {
          emojiCounts[em] = (emojiCounts[em] || 0) + 1;
        }
      }
    }
    textStmt.free();

    const topEmojis = Object.entries(emojiCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([emoji, count]) => ({ emoji, count }));

    return {
      totalMessages,
      totalMedia,
      totalWords,
      dateRange: { start: minDate || chat?.date_start || null, end: maxDate || chat?.date_end || null },
      participantStats,
      activityByHour,
      activityByDayOfWeek,
      topEmojis,
      mediaBreakdown: {
        images: mbRow.images || 0,
        videos: mbRow.videos || 0,
        audios: mbRow.audios || 0,
        stickers: mbRow.stickers || 0,
        documents: mbRow.documents || 0
      }
    };
  },

  // Starred Messages
  toggleStarMessage(chatId: string, messageId: string, isStarred: boolean) {
    const db = getDb();
    db.run('UPDATE messages SET is_starred = ? WHERE id = ? AND chat_id = ?', [isStarred ? 1 : 0, messageId, chatId]);
    saveDatabaseToDisk();
  },

  getStarredMessages(chatId: string): (Message & { sender_name?: string; sender_color?: string; sender_phone?: string; is_me?: number })[] {
    const db = getDb();
    const sql = `
      SELECT m.*, p.display_name as sender_name, p.color as sender_color, p.is_me as is_me, p.phone_number as sender_phone
      FROM messages m
      LEFT JOIN participants p ON m.sender_id = p.id
      WHERE m.chat_id = ? AND m.is_starred = 1
      ORDER BY m.timestamp ASC
    `;
    const stmt = db.prepare(sql);
    stmt.bind([chatId]);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  // Full Chat Export Query
  getAllMessagesForExport(chatId: string, startDate?: string, endDate?: string): (Message & { sender_name?: string; sender_color?: string; sender_phone?: string; is_me?: number })[] {
    const db = getDb();
    let sql = `
      SELECT m.*, p.display_name as sender_name, p.color as sender_color, p.is_me as is_me, p.phone_number as sender_phone
      FROM messages m
      LEFT JOIN participants p ON m.sender_id = p.id
      WHERE m.chat_id = ?
    `;
    const params: any[] = [chatId];
    if (startDate) {
      sql += ' AND m.date_str >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND m.date_str <= ?';
      params.push(endDate);
    }
    sql += ' ORDER BY m.timestamp ASC';
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
};

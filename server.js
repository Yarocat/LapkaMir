import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const VALID_ROOMS = new Set(['central', 'cafe', 'shop', 'next_street']);
const VALID_RACES = new Set(['dog', 'cat', 'rabbit']);
const VALID_GENDERS = new Set(['male', 'female']);
const DEFAULT_OUTFIT = {
  hat: 'none',
  top: 'none',
  bottom: 'none',
  shoes: 'none',
  accessory: 'none',
};

// ---------------------------------------------------------------------------
// 1. SQLite Database Initialization (database.db)
// ---------------------------------------------------------------------------
const dbPath = path.resolve(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT 'male',
    race TEXT NOT NULL DEFAULT 'dog',
    phenotype TEXT NOT NULL DEFAULT 'pheno0',
    outfit_json TEXT NOT NULL,
    has_character INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    uid TEXT NOT NULL,
    author_name TEXT NOT NULL,
    speaker_type TEXT NOT NULL DEFAULT 'player',
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room_time
    ON messages (room_id, created_at);
`);

function getOrCreateSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('session_secret');
  if (row?.value) return row.value;
  const generated = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run('session_secret', generated);
  return generated;
}

const SESSION_SECRET = getOrCreateSessionSecret();

// ---------------------------------------------------------------------------
// 2. Auth & Password Hashing Utilities (scrypt + HMAC token)
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash).split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!parsed?.uid || (parsed.exp && Date.now() > parsed.exp)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeOutfit(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    hat: typeof src.hat === 'string' ? src.hat.slice(0, 40) : 'none',
    top: typeof src.top === 'string' ? src.top.slice(0, 40) : 'none',
    bottom: typeof src.bottom === 'string' ? src.bottom.slice(0, 40) : 'none',
    shoes: typeof src.shoes === 'string' ? src.shoes.slice(0, 40) : 'none',
    accessory: typeof src.accessory === 'string' ? src.accessory.slice(0, 40) : 'none',
  };
}

function rowToUserDto(row) {
  let outfit = { ...DEFAULT_OUTFIT };
  try {
    outfit = sanitizeOutfit(JSON.parse(row.outfit_json));
  } catch {
    outfit = { ...DEFAULT_OUTFIT };
  }
  return {
    uid: row.uid,
    login: row.login,
    hasCharacter: Boolean(row.has_character),
    character: row.has_character
      ? {
          uid: row.uid,
          login: row.login,
          name: row.name,
          gender: row.gender,
          race: row.race,
          phenotype: row.phenotype,
          outfit,
        }
      : null,
  };
}

// Prepared SQLite statements
const stmtFindUserByLogin = db.prepare('SELECT * FROM users WHERE login = ?');
const stmtFindUserByUid = db.prepare('SELECT * FROM users WHERE uid = ?');
const stmtInsertUser = db.prepare(`
  INSERT INTO users (uid, login, password_hash, name, gender, race, phenotype, outfit_json, has_character, created_at, updated_at)
  VALUES (?, ?, ?, '', 'male', 'dog', 'pheno0', ?, 0, ?, ?)
`);
const stmtUpdateCharacter = db.prepare(`
  UPDATE users
  SET name = ?, gender = ?, race = ?, phenotype = ?, outfit_json = ?, has_character = 1, updated_at = ?
  WHERE uid = ?
`);
const stmtUpdateOutfit = db.prepare(`
  UPDATE users
  SET outfit_json = ?, updated_at = ?
  WHERE uid = ?
`);
const stmtInsertMessage = db.prepare(`
  INSERT INTO messages (id, room_id, uid, author_name, speaker_type, text, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetRecentMessages = db.prepare(`
  SELECT id, uid, author_name, speaker_type, room_id, text, created_at
  FROM messages
  WHERE room_id = ?
  ORDER BY created_at DESC
  LIMIT 50
`);

function getRoomMessages(roomId) {
  const rows = stmtGetRecentMessages.all(roomId);
  return rows.reverse().map((r) => ({
    id: r.id,
    uid: r.uid,
    authorName: r.author_name,
    speakerType: r.speaker_type,
    roomId: r.room_id,
    text: r.text,
    createdAtMs: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// 3. Gemini AI Client (Server-Side NPC Stylist)
// ---------------------------------------------------------------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  app.use(express.json({ limit: '64kb' }));

  // Auth middleware for REST routes
  function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Требуется авторизация.' });
      return;
    }
    const userRow = stmtFindUserByUid.get(decoded.uid);
    if (!userRow) {
      res.status(401).json({ error: 'Пользователь не найден.' });
      return;
    }
    req.userRow = userRow;
    next();
  }

  // -------------------------------------------------------------------------
  // REST Endpoints: Auth & Profile
  // -------------------------------------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const rawLogin = typeof req.body?.login === 'string' ? req.body.login.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!/^[a-zA-Z0-9_.-]{2,24}$/.test(rawLogin)) {
      res.status(400).json({ error: 'Логин должен содержать 2–24 латинских символа, цифры или _ . -' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов.' });
      return;
    }

    const existing = stmtFindUserByLogin.get(rawLogin);
    if (existing) {
      res.status(409).json({ error: 'Этот логин уже занят. Выберите другой или войдите в аккаунт.' });
      return;
    }

    const uid = `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = Date.now();
    const passHash = hashPassword(password);
    stmtInsertUser.run(uid, rawLogin, passHash, JSON.stringify(DEFAULT_OUTFIT), now, now);

    const userRow = stmtFindUserByUid.get(uid);
    const token = signToken({ uid, login: rawLogin, exp: now + 30 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ token, user: rowToUserDto(userRow) });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawLogin = typeof req.body?.login === 'string' ? req.body.login.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!rawLogin || !password) {
      res.status(400).json({ error: 'Введите логин и пароль.' });
      return;
    }

    const userRow = stmtFindUserByLogin.get(rawLogin);
    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      res.status(401).json({ error: 'Неверный логин или пароль.' });
      return;
    }

    const now = Date.now();
    const token = signToken({ uid: userRow.uid, login: userRow.login, exp: now + 30 * 24 * 60 * 60 * 1000 });
    res.json({ token, user: rowToUserDto(userRow) });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: rowToUserDto(req.userRow) });
  });

  // Authoritative server state for active Socket.io players
  const activePlayers = new Map(); // uid -> OnlinePlayer
  const userSockets = new Map(); // uid -> Set<socketId>

  app.put('/api/profile', requireAuth, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 24) : '';
    const gender = VALID_GENDERS.has(req.body?.gender) ? req.body.gender : 'male';
    const race = VALID_RACES.has(req.body?.race) ? req.body.race : 'dog';
    const phenotype =
      typeof req.body?.phenotype === 'string' && req.body.phenotype.trim()
        ? req.body.phenotype.trim().slice(0, 32)
        : 'pheno0';
    const outfit = sanitizeOutfit(req.body?.outfit);

    if (!name) {
      res.status(400).json({ error: 'Имя персонажа не может быть пустым.' });
      return;
    }

    const now = Date.now();
    stmtUpdateCharacter.run(name, gender, race, phenotype, JSON.stringify(outfit), now, req.userRow.uid);

    const updatedRow = stmtFindUserByUid.get(req.userRow.uid);
    const dto = rowToUserDto(updatedRow);

    // Sync active multiplayer state immediately
    const active = activePlayers.get(req.userRow.uid);
    if (active && dto.character) {
      active.name = dto.character.name;
      active.gender = dto.character.gender;
      active.race = dto.character.race;
      active.phenotype = dto.character.phenotype;
      active.outfit = dto.character.outfit;
      io.to(active.roomId).emit('player:updated', active);
    }

    res.json({ user: dto });
  });

  // -------------------------------------------------------------------------
  // REST Endpoint: Gemini AI NPC Stylist
  // -------------------------------------------------------------------------
  app.post('/api/npc-stylist', requireAuth, async (req, res) => {
    try {
      const { playerName, raceLabel, phenotypeLabel, outfitLabels, message, triggerType } = req.body ?? {};

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY не настроен на сервере. Проверьте панель Settings > Secrets.',
        });
        return;
      }

      const safeName =
        typeof playerName === 'string' && playerName.trim() ? playerName.trim().slice(0, 24) : 'Друг';
      const safeRace = typeof raceLabel === 'string' ? raceLabel.slice(0, 32) : 'Персонаж';
      const safePhenotype = typeof phenotypeLabel === 'string' ? phenotypeLabel.slice(0, 48) : 'обычный окрас';
      const safeMsg = typeof message === 'string' ? message.trim().slice(0, 220) : '';
      const outfitSummary =
        outfitLabels && typeof outfitLabels === 'object'
          ? `Шапка: ${outfitLabels.hat || 'Без шапки'}, Верх: ${outfitLabels.top || 'Без верха'}, Низ: ${outfitLabels.bottom || 'Без низа'}, Обувь: ${outfitLabels.shoes || 'Босиком'}, Аксессуар: ${outfitLabels.accessory || 'Нет'}`
          : 'Без одежды';

      const userPrompt =
        triggerType === 'approach'
          ? `Игрок ${safeName} (${safeRace}, ${safePhenotype}) только что подошёл к тебе поближе на Центральной улице. Его текущий наряд: ${outfitSummary}. Поприветствуй его по имени и ярко прокомментируй его образ и обувь!`
          : `Игрок ${safeName} (${safeRace}, ${safePhenotype}) в наряде [${outfitSummary}] написал в чате: "${safeMsg}". Ответь ему по имени, поддержи диалог и обязательно оцени его текущую одежду и обувь (или посоветуй заглянуть в Dog Style, если чего-то не хватает).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction:
            'Ты — Пёс-стилист Арчи, харизматичный и дружелюбный модный эксперт на Центральной улице рядом с бутиком «Dog Style» в уютной 2D-игре. ' +
            'Отвечай живо, по-русски, обязательно обращайся к игроку по имени и прямо комментируй его текущую одежду, обувь и аксессуары. ' +
            'Если игрок босиком или без одежды — пошути по-доброму и позови в «Dog Style». ' +
            'Пиши кратко: 1–2 живых предложения, строго до 185 символов, чтобы текст красиво поместился в комиксное облачко над головой.',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const reply = (response.text ?? '').trim();
      if (!reply) {
        res.status(502).json({ error: 'ИИ-стилист задумался и не смог сформировать ответ.' });
        return;
      }

      const replyText = reply.slice(0, 215);
      const now = Date.now();
      const msgRecord = {
        id: `npc_${crypto.randomUUID()}`,
        uid: 'npc_stylist_archie',
        authorName: 'Пёс-стилист Арчи',
        speakerType: 'npc',
        roomId: 'central',
        text: replyText,
        createdAtMs: now,
      };

      stmtInsertMessage.run(
        msgRecord.id,
        msgRecord.roomId,
        msgRecord.uid,
        msgRecord.authorName,
        msgRecord.speakerType,
        msgRecord.text,
        msgRecord.createdAtMs
      );

      // Broadcast Archie's reply to everyone on Central Street in real time
      io.to('central').emit('chat:message', msgRecord);
      io.to('central').emit('npc:bubble', { text: replyText, time: now });

      res.json({ reply: replyText });
    } catch (err) {
      console.error('Gemini NPC Stylist error:', err);
      const msg = err instanceof Error ? err.message : 'Ошибка сервера при обращении к Gemini API.';
      const status =
        msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
          ? 429
          : msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')
          ? 403
          : 500;
      res.status(status).json({ error: msg });
    }
  });

  // -------------------------------------------------------------------------
  // 4. Socket.io Real-Time Multiplayer & Chat
  // -------------------------------------------------------------------------
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const decoded = verifyToken(token);
    if (!decoded) {
      next(new Error('Unauthorized'));
      return;
    }
    const userRow = stmtFindUserByUid.get(decoded.uid);
    if (!userRow) {
      next(new Error('User not found'));
      return;
    }
    socket.data.uid = userRow.uid;
    next();
  });

  io.on('connection', (socket) => {
    const uid = socket.data.uid;
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    socket.on('room:join', ({ roomId, x, y } = {}) => {
      const targetRoom = VALID_ROOMS.has(roomId) ? roomId : 'central';
      const userRow = stmtFindUserByUid.get(uid);
      if (!userRow || !userRow.has_character) return;
      const dto = rowToUserDto(userRow);
      if (!dto.character) return;

      const prevPlayer = activePlayers.get(uid);
      if (prevPlayer && prevPlayer.roomId !== targetRoom) {
        socket.leave(prevPlayer.roomId);
        socket.to(prevPlayer.roomId).emit('player:left', { uid });
      }

      const safeX = Number.isFinite(x) ? Math.max(0, Math.min(1348, Math.round(x))) : 565;
      const safeY = Number.isFinite(y) ? Math.max(0, Math.min(784, Math.round(y))) : 605;

      const playerState = {
        uid: dto.character.uid,
        name: dto.character.name,
        gender: dto.character.gender,
        race: dto.character.race,
        phenotype: dto.character.phenotype,
        outfit: dto.character.outfit,
        roomId: targetRoom,
        x: safeX,
        y: safeY,
        targetX: safeX,
        targetY: safeY,
        direction: 0,
        emote: '',
        emoteTime: 0,
        lastMessage: '',
        lastMessageTime: 0,
      };

      activePlayers.set(uid, playerState);
      socket.join(targetRoom);

      const playersInRoom = Array.from(activePlayers.values()).filter(
        (p) => p.roomId === targetRoom
      );
      const messages = getRoomMessages(targetRoom);

      socket.emit('room:state', {
        roomId: targetRoom,
        players: playersInRoom,
        messages,
      });

      socket.to(targetRoom).emit('player:joined', playerState);
    });

    socket.on('player:move', ({ x, y, targetX, targetY, direction } = {}) => {
      const player = activePlayers.get(uid);
      if (!player) return;

      player.x = Number.isFinite(x) ? Math.max(0, Math.min(1348, Math.round(x))) : player.x;
      player.y = Number.isFinite(y) ? Math.max(0, Math.min(784, Math.round(y))) : player.y;
      player.targetX = Number.isFinite(targetX)
        ? Math.max(0, Math.min(1348, Math.round(targetX)))
        : player.targetX;
      player.targetY = Number.isFinite(targetY)
        ? Math.max(0, Math.min(784, Math.round(targetY)))
        : player.targetY;
      player.direction =
        Number.isInteger(direction) && direction >= 0 && direction <= 7 ? direction : player.direction;

      socket.to(player.roomId).emit('player:updated', player);
    });

    socket.on('player:emote', ({ emote } = {}) => {
      const player = activePlayers.get(uid);
      if (!player || typeof emote !== 'string') return;
      player.emote = emote.slice(0, 24);
      player.emoteTime = Date.now();
      io.to(player.roomId).emit('player:updated', player);
    });

    socket.on('player:outfit', ({ outfit } = {}) => {
      const player = activePlayers.get(uid);
      const cleanOutfit = sanitizeOutfit(outfit);
      const now = Date.now();
      stmtUpdateOutfit.run(JSON.stringify(cleanOutfit), now, uid);

      if (player) {
        player.outfit = cleanOutfit;
        io.to(player.roomId).emit('player:updated', player);
      }
    });

    socket.on('chat:send', ({ text } = {}) => {
      const player = activePlayers.get(uid);
      if (!player || typeof text !== 'string') return;
      const cleanText = text.trim().slice(0, 220);
      if (!cleanText) return;

      const now = Date.now();
      player.lastMessage = cleanText;
      player.lastMessageTime = now;

      const msgRecord = {
        id: `m_${crypto.randomUUID()}`,
        uid,
        authorName: player.name,
        speakerType: 'player',
        roomId: player.roomId,
        text: cleanText,
        createdAtMs: now,
      };

      stmtInsertMessage.run(
        msgRecord.id,
        msgRecord.roomId,
        msgRecord.uid,
        msgRecord.authorName,
        msgRecord.speakerType,
        msgRecord.text,
        msgRecord.createdAtMs
      );

      io.to(player.roomId).emit('player:updated', player);
      io.to(player.roomId).emit('chat:message', msgRecord);
    });

    socket.on('disconnect', () => {
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(uid);
          const player = activePlayers.get(uid);
          if (player) {
            const room = player.roomId;
            activePlayers.delete(uid);
            io.to(room).emit('player:left', { uid });
          }
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // 5. Vite Middleware (Dev) or Static Assets (Prod)
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT} (SQLite: ${dbPath})`);
  });
}

startServer();

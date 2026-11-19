import { io } from 'socket.io-client';

const TOKEN_KEY = 'lapkograd_auth_token';

class BackendService {
  constructor() {
    this.socket = null;
    this.lastRoomJoin = null;
  }

  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  async request(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Ошибка сервера (${res.status})`);
    }
    return data;
  }

  async register(login, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    this.setToken(data.token);
    return data.user;
  }

  async login(login, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    this.setToken(data.token);
    return data.user;
  }

  async getCurrentUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const data = await this.request('/api/auth/me');
      return data.user;
    } catch {
      this.setToken(null);
      return null;
    }
  }

  async saveCharacter(config) {
    const data = await this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return data.user;
  }

  async askNpcStylist(payload) {
    return this.request('/api/npc-stylist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  logout() {
    this.disconnectSocket();
    this.setToken(null);
    this.lastRoomJoin = null;
  }

  connectSocket() {
    const token = this.getToken();
    if (!token) return null;
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
      return this.socket;
    }

    this.socket = io({
      auth: { token },
      reconnection: true,
      reconnectionDelay: 600,
      reconnectionDelayMax: 4000,
    });

    this.socket.on('connect', () => {
      if (this.lastRoomJoin) {
        this.socket.emit('room:join', this.lastRoomJoin);
      }
    });

    return this.socket;
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId, x, y) {
    this.lastRoomJoin = { roomId, x, y };
    const sock = this.connectSocket();
    if (sock && sock.connected) {
      sock.emit('room:join', { roomId, x, y });
    }
  }

  sendMove(x, y, targetX, targetY, direction) {
    if (this.lastRoomJoin) {
      this.lastRoomJoin.x = x;
      this.lastRoomJoin.y = y;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:move', { x, y, targetX, targetY, direction });
    }
  }

  sendEmote(emote) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:emote', { emote });
    }
  }

  sendOutfit(outfit) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:outfit', { outfit });
    }
  }

  sendChat(text) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', { text });
    }
  }

  subscribeRoomEvents(handlers) {
    const sock = this.connectSocket();
    if (!sock) return () => {};

    const onRoomState = (payload) => handlers.onRoomState?.(payload);
    const onPlayerJoined = (player) => handlers.onPlayerJoined?.(player);
    const onPlayerUpdated = (player) => handlers.onPlayerUpdated?.(player);
    const onPlayerLeft = (payload) => handlers.onPlayerLeft?.(payload);
    const onChatMessage = (msg) => handlers.onChatMessage?.(msg);
    const onNpcBubble = (payload) => handlers.onNpcBubble?.(payload);

    sock.on('room:state', onRoomState);
    sock.on('player:joined', onPlayerJoined);
    sock.on('player:updated', onPlayerUpdated);
    sock.on('player:left', onPlayerLeft);
    sock.on('chat:message', onChatMessage);
    sock.on('npc:bubble', onNpcBubble);

    return () => {
      sock.off('room:state', onRoomState);
      sock.off('player:joined', onPlayerJoined);
      sock.off('player:updated', onPlayerUpdated);
      sock.off('player:left', onPlayerLeft);
      sock.off('chat:message', onChatMessage);
      sock.off('npc:bubble', onNpcBubble);
    };
  }
}

export const backendService = new BackendService();
export default backendService;

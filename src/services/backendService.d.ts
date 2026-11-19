import {
  CharacterConfig,
  ChatMessage,
  Direction,
  OnlinePlayer,
  Outfit,
  RoomId,
  UserProfile,
} from '../types/game';

export interface AuthUserDTO {
  uid: string;
  login: string;
  hasCharacter: boolean;
  character: UserProfile | null;
}

export interface RoomEventHandlers {
  onRoomState?: (payload: {
    roomId: RoomId;
    players: OnlinePlayer[];
    messages: ChatMessage[];
  }) => void;
  onPlayerJoined?: (player: OnlinePlayer) => void;
  onPlayerUpdated?: (player: OnlinePlayer) => void;
  onPlayerLeft?: (payload: { uid: string }) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onNpcBubble?: (payload: { text: string; time: number }) => void;
}

export const backendService: {
  register(login: string, password: string): Promise<AuthUserDTO>;
  login(login: string, password: string): Promise<AuthUserDTO>;
  getCurrentUser(): Promise<AuthUserDTO | null>;
  saveCharacter(config: CharacterConfig): Promise<AuthUserDTO>;
  askNpcStylist(payload: {
    playerName: string;
    raceLabel: string;
    phenotypeLabel: string;
    outfitLabels: Record<string, string>;
    message: string;
    triggerType: 'approach' | 'chat';
  }): Promise<{ reply: string }>;
  logout(): void;
  connectSocket(): unknown;
  disconnectSocket(): void;
  joinRoom(roomId: RoomId, x: number, y: number): void;
  sendMove(x: number, y: number, targetX: number, targetY: number, direction: Direction): void;
  sendEmote(emote: string): void;
  sendOutfit(outfit: Outfit): void;
  sendChat(text: string): void;
  subscribeRoomEvents(handlers: RoomEventHandlers): () => void;
};

export default backendService;

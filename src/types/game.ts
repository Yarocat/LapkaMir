export type Gender = 'male' | 'female';
export type Race = 'dog' | 'cat' | 'rabbit';

/**
 * 0: Down (front)
 * 1: Down-Left
 * 2: Left (profile)
 * 3: Up-Left
 * 4: Up (back)
 * 5: Up-Right
 * 6: Right (profile)
 * 7: Down-Right
 */
export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RoomId = 'central' | 'cafe' | 'shop' | 'next_street';

export type OutfitSlot = 'hat' | 'top' | 'bottom' | 'shoes' | 'accessory';

export interface Outfit {
  hat: string;
  top: string;
  bottom: string;
  shoes: string;
  accessory: string;
}

export interface CharacterConfig {
  name: string;
  gender: Gender;
  race: Race;
  phenotype: string;
  outfit: Outfit;
}

export interface UserProfile extends CharacterConfig {
  uid: string;
  login: string;
}

export interface OnlinePlayer extends CharacterConfig {
  uid: string;
  roomId: RoomId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  direction: Direction;
  emote: string;
  emoteTime: number;
  lastMessage: string;
  lastMessageTime: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  authorName: string;
  speakerType: 'player' | 'npc';
  roomId: RoomId;
  text: string;
  createdAtMs: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EntranceZone {
  id: string;
  label: string;
  targetRoom: RoomId;
  rect: { x: number; y: number; w: number; h: number };
  walkTarget: Point;
  spawnPoint: Point;
  shape?: 'rect' | 'circle';
}

export interface RoomConfig {
  id: RoomId;
  name: string;
  subtitle: string;
  bgImage?: string;
  walkablePolygon: Point[];
  entrances: EntranceZone[];
  defaultSpawn: Point;
  scaleRange: {
    minY: number;
    maxY: number;
    minScale: number;
    maxScale: number;
  };
}

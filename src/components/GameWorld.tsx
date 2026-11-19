import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Edit3,
  LogOut,
  MapPin,
  MessageSquare,
  Send,
  Shirt,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import { drawAvatar, preloadDogSprites } from '../canvas/avatarRenderer';
import {
  drawInteractiveHighlights,
  drawRoomBackground,
  drawZoneEditorOverlay,
} from '../canvas/roomRenderer';
import {
  getOutfitLabels,
  NPC_STYLIST,
  PHENOTYPES_BY_RACE,
  QUICK_EMOTES,
  RACE_LABELS,
} from '../data/catalog';
import { DOG_STYLE_STAND_RECT, ROOMS, WORLD_HEIGHT, WORLD_WIDTH } from '../data/rooms';
import backendService from '../services/backendService.js';
import {
  ChatMessage,
  Direction,
  EntranceZone,
  OnlinePlayer,
  Outfit,
  Point,
  RoomConfig,
  RoomId,
  UserProfile,
} from '../types/game';
import {
  clampPointToPolygon,
  computeDirection,
  getScaleForY,
  pointInRect,
} from '../utils/geometry';
import { WardrobeModal } from './WardrobeModal';

interface GameWorldProps {
  profile: UserProfile;
  onEditAppearance: () => void;
  onUpdateOutfit: (outfit: Outfit) => Promise<void>;
  onLogout: () => void;
}

const WALK_SPEED = 245; // world px/sec

export const GameWorld: React.FC<GameWorldProps> = ({
  profile,
  onEditAppearance,
  onUpdateOutfit,
  onLogout,
}) => {
  const [roomId, setRoomId] = useState<RoomId>('central');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [wardrobeMode, setWardrobeMode] = useState<'wardrobe' | 'shop' | null>(null);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [npcThinking, setNpcThinking] = useState(false);
  const [npcError, setNpcError] = useState<string | null>(null);

  // Zone Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editableRooms, setEditableRooms] = useState<Record<RoomId, RoomConfig>>(() =>
    JSON.parse(JSON.stringify(ROOMS))
  );
  const [copiedCoords, setCopiedCoords] = useState(false);

  const currentRoom = editableRooms[roomId];

  // Live animation refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const localPosRef = useRef<Point>({ ...ROOMS.central.defaultSpawn });
  const localTargetRef = useRef<Point>({ ...ROOMS.central.defaultSpawn });
  const localDirRef = useRef<Direction>(0);
  const localBubbleRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const localEmoteRef = useRef<{ emote: string; time: number }>({ emote: '', time: 0 });
  const pendingEntranceRef = useRef<EntranceZone | null>(null);

  const remoteInterpRef = useRef<
    Map<string, { x: number; y: number; direction: Direction }>
  >(new Map());

  const hoveredEntranceRef = useRef<EntranceZone | null>(null);
  const hoveringStandRef = useRef<boolean>(false);
  const [cursorPointer, setCursorPointer] = useState(false);

  // NPC Stylist state refs
  const npcBubbleRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const npcDirRef = useRef<Direction>(1);
  const lastNpcApproachRef = useRef<number>(0);
  const wasNearNpcRef = useRef<boolean>(false);

  // Zone editor dragging ref
  const dragStateRef = useRef<
    | { type: 'vertex'; index: number }
    | { type: 'entrance'; index: number; offsetX: number; offsetY: number }
    | null
  >(null);
  const activeHandleRef = useRef<number | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    preloadDogSprites();
  }, []);

  // Connect Socket.io and subscribe to real-time room events
  useEffect(() => {
    const unsubscribe = backendService.subscribeRoomEvents({
      onRoomState: ({ roomId: stateRoom, players, messages: roomMessages }) => {
        if (stateRoom !== roomId) return;
        setOnlinePlayers(players);
        setMessages(roomMessages.slice(-50));
      },
      onPlayerJoined: (player) => {
        if (player.roomId !== roomId) return;
        setOnlinePlayers((prev) => {
          const exists = prev.some((p) => p.uid === player.uid);
          if (exists) {
            return prev.map((p) => (p.uid === player.uid ? player : p));
          }
          return [...prev, player];
        });
      },
      onPlayerUpdated: (player) => {
        if (player.roomId !== roomId) return;
        setOnlinePlayers((prev) => {
          const exists = prev.some((p) => p.uid === player.uid);
          if (!exists) return [...prev, player];
          return prev.map((p) => (p.uid === player.uid ? player : p));
        });
      },
      onPlayerLeft: ({ uid }) => {
        remoteInterpRef.current.delete(uid);
        setOnlinePlayers((prev) => prev.filter((p) => p.uid !== uid));
      },
      onChatMessage: (msg) => {
        if (msg.roomId !== roomId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg].slice(-50);
        });
      },
      onNpcBubble: ({ text, time }) => {
        if (roomId === 'central') {
          npcBubbleRef.current = { text, time };
        }
      },
    });

    backendService.joinRoom(
      roomId,
      Math.round(localPosRef.current.x),
      Math.round(localPosRef.current.y)
    );

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    return () => {
      backendService.disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatOpen]);

  // Call Gemini AI Stylist NPC via local Express server
  const triggerNpcStylist = useCallback(
    async (triggerType: 'approach' | 'chat', userMessage = '') => {
      if (npcThinking || roomId !== 'central') return;
      setNpcThinking(true);
      setNpcError(null);

      const dx = localPosRef.current.x - NPC_STYLIST.x;
      const dy = localPosRef.current.y - NPC_STYLIST.y;
      npcDirRef.current = computeDirection(dx, dy);

      const phenotypeLabel =
        PHENOTYPES_BY_RACE[profile.race].find((p) => p.id === profile.phenotype)?.label ??
        profile.phenotype;

      try {
        const data = await backendService.askNpcStylist({
          playerName: profile.name,
          raceLabel: RACE_LABELS[profile.race],
          phenotypeLabel,
          outfitLabels: getOutfitLabels(profile.outfit),
          message: userMessage,
          triggerType,
        });
        npcBubbleRef.current = { text: data.reply, time: Date.now() };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Ошибка ИИ-стилиста';
        setNpcError(msg);
      } finally {
        setNpcThinking(false);
      }
    },
    [npcThinking, roomId, profile]
  );

  // Room switching helper
  const enterRoom = useCallback(
    (targetRoom: RoomId, spawnPoint: Point) => {
      pendingEntranceRef.current = null;
      hoveredEntranceRef.current = null;
      hoveringStandRef.current = false;
      setCursorPointer(false);

      const clampedSpawn = clampPointToPolygon(
        spawnPoint,
        editableRooms[targetRoom].walkablePolygon
      );
      localPosRef.current = { ...clampedSpawn };
      localTargetRef.current = { ...clampedSpawn };
      localDirRef.current = 0;
      remoteInterpRef.current.clear();
      setRoomId(targetRoom);
    },
    [editableRooms]
  );

  // Main 60FPS Game Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (perfNow: number) => {
      const dt = Math.min(0.05, (perfNow - lastTime) / 1000);
      lastTime = perfNow;
      const nowMs = Date.now();

      // 1. Local player movement
      const pos = localPosRef.current;
      const tgt = localTargetRef.current;
      const dx = tgt.x - pos.x;
      const dy = tgt.y - pos.y;
      const dist = Math.hypot(dx, dy);
      let isLocalMoving = false;

      if (dist > 3) {
        isLocalMoving = true;
        const step = Math.min(dist, WALK_SPEED * dt);
        pos.x += (dx / dist) * step;
        pos.y += (dy / dist) * step;
        localDirRef.current = computeDirection(dx, dy);
      } else {
        pos.x = tgt.x;
        pos.y = tgt.y;
        if (pendingEntranceRef.current) {
          const ent = pendingEntranceRef.current;
          pendingEntranceRef.current = null;
          enterRoom(ent.targetRoom, ent.spawnPoint);
        }
      }

      // 2. Proximity check for AI NPC Stylist in Central Street
      if (roomId === 'central') {
        const distToNpc = Math.hypot(pos.x - NPC_STYLIST.x, pos.y - NPC_STYLIST.y);
        if (distToNpc < 125) {
          if (!wasNearNpcRef.current && nowMs - lastNpcApproachRef.current > 18000) {
            lastNpcApproachRef.current = nowMs;
            triggerNpcStylist('approach');
          }
          wasNearNpcRef.current = true;
        } else if (distToNpc > 175) {
          wasNearNpcRef.current = false;
        }
      }

      // 3. Interpolate remote players smoothly
      for (const p of onlinePlayers) {
        if (p.uid === profile.uid) continue;
        let interp = remoteInterpRef.current.get(p.uid);
        if (!interp) {
          interp = { x: p.x, y: p.y, direction: p.direction };
          remoteInterpRef.current.set(p.uid, interp);
        }
        const rdx = p.targetX - interp.x;
        const rdy = p.targetY - interp.y;
        const rdist = Math.hypot(rdx, rdy);
        if (rdist > 3) {
          const step = Math.min(rdist, WALK_SPEED * dt);
          interp.x += (rdx / rdist) * step;
          interp.y += (rdy / rdist) * step;
          interp.direction = computeDirection(rdx, rdy);
        } else {
          interp.x = p.targetX;
          interp.y = p.targetY;
          interp.direction = p.direction;
        }
      }

      // 4. Render Scene
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
          drawRoomBackground(ctx, currentRoom, nowMs);

          if (!editorOpen) {
            drawInteractiveHighlights(
              ctx,
              currentRoom,
              hoveredEntranceRef.current,
              hoveringStandRef.current
            );
          }

          type RenderEntity = {
            y: number;
            draw: () => void;
          };
          const entities: RenderEntity[] = [];

          // Local player
          entities.push({
            y: pos.y,
            draw: () =>
              drawAvatar(ctx, {
                character: profile,
                x: pos.x,
                y: pos.y,
                scale: getScaleForY(pos.y, currentRoom),
                direction: localDirRef.current,
                isMoving: isLocalMoving,
                emote: localEmoteRef.current.emote,
                emoteTime: localEmoteRef.current.time,
                lastMessage: localBubbleRef.current.text,
                lastMessageTime: localBubbleRef.current.time,
                nowMs,
                isLocalPlayer: true,
              }),
          });

          // Remote players
          for (const p of onlinePlayers) {
            if (p.uid === profile.uid) continue;
            const interp = remoteInterpRef.current.get(p.uid) ?? {
              x: p.x,
              y: p.y,
              direction: p.direction,
            };
            const isMovingRemote =
              Math.hypot(p.targetX - interp.x, p.targetY - interp.y) > 4;

            entities.push({
              y: interp.y,
              draw: () =>
                drawAvatar(ctx, {
                  character: p,
                  x: interp.x,
                  y: interp.y,
                  scale: getScaleForY(interp.y, currentRoom),
                  direction: interp.direction,
                  isMoving: isMovingRemote,
                  emote: p.emote,
                  emoteTime: p.emoteTime,
                  lastMessage: p.lastMessage,
                  lastMessageTime: p.lastMessageTime,
                  nowMs,
                  isLocalPlayer: false,
                }),
            });
          }

          // AI NPC Stylist in Central Street
          if (roomId === 'central') {
            entities.push({
              y: NPC_STYLIST.y,
              draw: () =>
                drawAvatar(ctx, {
                  character: {
                    name: NPC_STYLIST.name,
                    gender: 'male',
                    race: NPC_STYLIST.race,
                    phenotype: NPC_STYLIST.phenotype,
                    outfit: NPC_STYLIST.outfit,
                  },
                  x: NPC_STYLIST.x,
                  y: NPC_STYLIST.y,
                  scale: getScaleForY(NPC_STYLIST.y, currentRoom),
                  direction: npcDirRef.current,
                  isMoving: false,
                  lastMessage: npcBubbleRef.current.text,
                  lastMessageTime: npcBubbleRef.current.time,
                  nowMs,
                  isNpc: true,
                }),
            });
          }

          entities.sort((a, b) => a.y - b.y);
          for (const ent of entities) {
            ent.draw();
          }

          if (editorOpen) {
            drawZoneEditorOverlay(
              ctx,
              currentRoom.walkablePolygon,
              currentRoom.entrances,
              activeHandleRef.current
            );
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [
    currentRoom,
    editorOpen,
    enterRoom,
    onlinePlayers,
    profile,
    roomId,
    triggerNpcStylist,
  ]);

  const getWorldPointFromPointer = (
    e: React.MouseEvent<HTMLCanvasElement>
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WORLD_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * WORLD_HEIGHT;
    return {
      x: Math.max(0, Math.min(WORLD_WIDTH, x)),
      y: Math.max(0, Math.min(WORLD_HEIGHT, y)),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getWorldPointFromPointer(e);

    if (editorOpen) {
      const vIdx = currentRoom.walkablePolygon.findIndex(
        (v) => Math.hypot(v.x - pt.x, v.y - pt.y) <= 14
      );
      if (vIdx !== -1) {
        dragStateRef.current = { type: 'vertex', index: vIdx };
        activeHandleRef.current = vIdx;
        return;
      }

      const eIdx = currentRoom.entrances.findIndex((ent) => pointInRect(pt, ent.rect));
      if (eIdx !== -1) {
        const ent = currentRoom.entrances[eIdx];
        dragStateRef.current = {
          type: 'entrance',
          index: eIdx,
          offsetX: pt.x - ent.rect.x,
          offsetY: pt.y - ent.rect.y,
        };
        return;
      }
      return;
    }

    if (roomId === 'shop' && pointInRect(pt, DOG_STYLE_STAND_RECT)) {
      setWardrobeMode('shop');
      return;
    }

    const clickedEntrance = currentRoom.entrances.find((ent) => pointInRect(pt, ent.rect));
    if (clickedEntrance) {
      const clampedWalk = clampPointToPolygon(
        clickedEntrance.walkTarget,
        currentRoom.walkablePolygon
      );
      pendingEntranceRef.current = clickedEntrance;
      localTargetRef.current = clampedWalk;
      const dir = computeDirection(
        clampedWalk.x - localPosRef.current.x,
        clampedWalk.y - localPosRef.current.y
      );
      localDirRef.current = dir;
      backendService.sendMove(
        localPosRef.current.x,
        localPosRef.current.y,
        clampedWalk.x,
        clampedWalk.y,
        dir
      );
      return;
    }

    pendingEntranceRef.current = null;
    const clampedTarget = clampPointToPolygon(pt, currentRoom.walkablePolygon);
    localTargetRef.current = clampedTarget;
    const dir = computeDirection(
      clampedTarget.x - localPosRef.current.x,
      clampedTarget.y - localPosRef.current.y
    );
    localDirRef.current = dir;

    backendService.sendMove(
      localPosRef.current.x,
      localPosRef.current.y,
      clampedTarget.x,
      clampedTarget.y,
      dir
    );
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getWorldPointFromPointer(e);

    if (editorOpen) {
      const drag = dragStateRef.current;
      if (drag) {
        setEditableRooms((prev) => {
          const next = { ...prev };
          const roomCopy: RoomConfig = {
            ...next[roomId],
            walkablePolygon: [...next[roomId].walkablePolygon],
            entrances: next[roomId].entrances.map((ent) => ({
              ...ent,
              rect: { ...ent.rect },
            })),
          };
          if (drag.type === 'vertex') {
            roomCopy.walkablePolygon[drag.index] = {
              x: Math.round(pt.x),
              y: Math.round(pt.y),
            };
          } else {
            const ent = roomCopy.entrances[drag.index];
            ent.rect.x = Math.round(pt.x - drag.offsetX);
            ent.rect.y = Math.round(pt.y - drag.offsetY);
          }
          next[roomId] = roomCopy;
          return next;
        });
      }
      return;
    }

    const hoveredEnt =
      currentRoom.entrances.find((ent) => pointInRect(pt, ent.rect)) ?? null;
    hoveredEntranceRef.current = hoveredEnt;

    const overStand =
      roomId === 'shop' && pointInRect(pt, DOG_STYLE_STAND_RECT);
    hoveringStandRef.current = overStand;

    setCursorPointer(Boolean(hoveredEnt || overStand));
  };

  const handleCanvasMouseUp = () => {
    dragStateRef.current = null;
    activeHandleRef.current = null;
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = chatInput.trim().slice(0, 220);
    if (!cleanText) return;
    setChatInput('');

    localBubbleRef.current = { text: cleanText, time: Date.now() };
    backendService.sendChat(cleanText);

    if (roomId === 'central') {
      const lower = cleanText.toLowerCase();
      const distToNpc = Math.hypot(
        localPosRef.current.x - NPC_STYLIST.x,
        localPosRef.current.y - NPC_STYLIST.y
      );
      const addressedArchie =
        lower.includes('арчи') ||
        lower.includes('стил') ||
        lower.includes('одеж') ||
        lower.includes('обув') ||
        lower.includes('образ') ||
        lower.includes('привет') ||
        distToNpc < 240;

      if (addressedArchie) {
        triggerNpcStylist('chat', cleanText);
      }
    }
  };

  const handleEmote = (emoteId: string) => {
    localEmoteRef.current = { emote: emoteId, time: Date.now() };
    backendService.sendEmote(emoteId);
  };

  const handleSaveOutfit = async (newOutfit: Outfit) => {
    setSavingOutfit(true);
    try {
      await onUpdateOutfit(newOutfit);
      backendService.sendOutfit(newOutfit);
      setWardrobeMode(null);
    } finally {
      setSavingOutfit(false);
    }
  };

  const handleCopyCoordinates = async () => {
    const payload = {
      roomId: currentRoom.id,
      walkablePolygon: currentRoom.walkablePolygon,
      entrances: currentRoom.entrances.map((e) => ({
        id: e.id,
        label: e.label,
        rect: e.rect,
        walkTarget: e.walkTarget,
      })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2200);
    } catch {
      console.log('Zone Coordinates:', JSON.stringify(payload, null, 2));
    }
  };

  const onlineCount = useMemo(() => {
    const unique = new Set(onlinePlayers.map((p) => p.uid));
    unique.add(profile.uid);
    return unique.size;
  }, [onlinePlayers, profile.uid]);

  return (
    <div className="relative w-screen h-screen bg-[#161421] flex items-center justify-center overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={WORLD_WIDTH}
        height={WORLD_HEIGHT}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className={`max-w-full max-h-full aspect-[1348/784] shadow-2xl ${
          editorOpen ? 'cursor-crosshair' : cursorPointer ? 'cursor-pointer' : 'cursor-default'
        }`}
      />

      {/* TOP LEFT HUD */}
      <div className="fixed top-3 left-3 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 backdrop-blur-xs border-2 border-slate-900 rounded-2xl px-3.5 py-2 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm">
            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">{currentRoom.name}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 tabular-nums whitespace-nowrap">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Онлайн: {onlineCount}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onEditAppearance}
          className="bg-white/95 hover:bg-amber-100 border-2 border-slate-900 rounded-xl px-3 py-2 shadow-md font-bold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Изменить внешность
        </button>

        {roomId !== 'central' && (
          <button
            type="button"
            onClick={() => enterRoom('central', ROOMS.central.defaultSpawn)}
            className="bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 rounded-xl px-3 py-2 shadow-md font-extrabold text-xs text-slate-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            Выйти на Центральную улицу
          </button>
        )}

        {roomId === 'shop' && (
          <button
            type="button"
            onClick={() => setWardrobeMode('shop')}
            className="bg-indigo-600 hover:bg-indigo-500 border-2 border-slate-900 rounded-xl px-3.5 py-2 shadow-md font-extrabold text-xs text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
            Каталог одежды
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          title="Выйти из аккаунта"
          className="bg-white/95 hover:bg-rose-50 border-2 border-slate-900 rounded-xl px-3 py-2 shadow-md font-bold text-xs text-slate-800 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          Выйти
        </button>
      </div>

      {/* TOP RIGHT HUD: Zone Editor */}
      <div className="fixed top-3 right-3 z-20 flex items-center gap-2">
        {editorOpen && (
          <>
            <button
              type="button"
              onClick={handleCopyCoordinates}
              className="bg-emerald-400 hover:bg-emerald-300 border-2 border-slate-900 rounded-xl px-3 py-1.5 shadow-md font-extrabold text-xs text-slate-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCoords ? 'Скопировано!' : 'Скопировать координаты'}
            </button>
            <button
              type="button"
              onClick={() => setEditableRooms(JSON.parse(JSON.stringify(ROOMS)))}
              className="bg-white hover:bg-slate-100 border-2 border-slate-900 rounded-xl px-3 py-1.5 shadow-md font-bold text-xs text-slate-800 cursor-pointer whitespace-nowrap"
            >
              Сбросить
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setEditorOpen((v) => !v)}
          className={`border-2 border-slate-900 rounded-xl px-2.5 py-1.5 shadow-md font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
            editorOpen
              ? 'bg-amber-400 text-slate-950'
              : 'bg-white/80 hover:bg-white text-slate-700'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Редактор зон
        </button>
      </div>

      {/* RIGHT COLLAPSIBLE CHAT HISTORY PANEL */}
      <div
        className={`fixed top-14 right-3 z-20 transition-all duration-200 flex items-start ${
          chatOpen ? 'w-72 sm:w-80' : 'w-auto'
        }`}
      >
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          aria-label="Свернуть или развернуть чат"
          className="bg-white/95 hover:bg-amber-100 border-2 border-slate-900 rounded-xl p-2 shadow-lg cursor-pointer mr-1.5 shrink-0"
        >
          {chatOpen ? (
            <ChevronRight className="w-4 h-4 text-slate-900" />
          ) : (
            <div className="flex items-center gap-1.5 px-1">
              <ChevronLeft className="w-4 h-4 text-slate-900" />
              <MessageSquare className="w-4 h-4 text-slate-900" />
            </div>
          )}
        </button>

        {chatOpen && (
          <div className="flex-1 bg-white/92 backdrop-blur-xs border-2 border-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[54vh]">
            <div className="px-3.5 py-2 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wide">
                Чат: {currentRoom.name}
              </span>
              {npcThinking && (
                <span className="text-[11px] font-bold text-amber-300">
                  Арчи печатает...
                </span>
              )}
            </div>

            <div
              ref={chatScrollRef}
              className="p-3 space-y-2 overflow-y-auto text-xs min-h-[160px] max-h-[360px]"
            >
              {messages.length === 0 ? (
                <p className="text-slate-500 text-center py-4 font-semibold">
                  Напишите сообщение или подойдите к Псу-стилисту Арчи!
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-2 rounded-xl border ${
                      m.speakerType === 'npc'
                        ? 'bg-amber-50 border-amber-300'
                        : m.uid === profile.uid
                        ? 'bg-slate-100 border-slate-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <span
                      className={`font-extrabold mr-1.5 ${
                        m.speakerType === 'npc' ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      {m.authorName}:
                    </span>
                    <span className="text-slate-800 font-semibold break-words">
                      {m.text}
                    </span>
                  </div>
                ))
              )}

              {npcError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                  {npcError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL DOCK */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] max-w-3xl bg-white/95 backdrop-blur-xs border-3 border-slate-900 rounded-2xl p-2 shadow-2xl flex flex-wrap sm:flex-nowrap items-center gap-2">
        <div className="flex items-center gap-1 shrink-0">
          {QUICK_EMOTES.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => handleEmote(em.id)}
              title={em.label}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-amber-200 active:scale-95 border-2 border-slate-900 flex items-center justify-center text-lg transition-all cursor-pointer"
            >
              {em.emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSendChat} className="flex-1 flex items-center gap-2 min-w-[200px]">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              roomId === 'central'
                ? 'Написать в чат (Арчи оценит ваш стиль)...'
                : 'Написать сообщение в комнату...'
            }
            maxLength={220}
            className="flex-1 h-10 px-3.5 rounded-xl border-2 border-slate-300 focus:border-slate-900 focus:outline-none text-sm font-bold text-slate-900 bg-slate-50"
          />
          <button
            type="submit"
            aria-label="Отправить сообщение"
            className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 border-2 border-slate-900 font-extrabold text-sm text-slate-950 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Сказать</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => setWardrobeMode('wardrobe')}
          className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 font-extrabold text-sm flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Shirt className="w-4 h-4 text-amber-400" />
          Гардероб
        </button>
      </div>

      {wardrobeMode && (
        <WardrobeModal
          mode={wardrobeMode}
          character={profile}
          saving={savingOutfit}
          onClose={() => setWardrobeMode(null)}
          onSaveOutfit={handleSaveOutfit}
        />
      )}
    </div>
  );
};

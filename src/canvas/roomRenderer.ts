import { DOG_STYLE_STAND_RECT, WORLD_HEIGHT, WORLD_WIDTH } from '../data/rooms';
import { EntranceZone, Point, RoomConfig } from '../types/game';

const bgCache = new Map<string, HTMLImageElement>();

function getBgImage(url: string): HTMLImageElement | null {
  let img = bgCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    bgCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function drawCafeInterior(ctx: CanvasRenderingContext2D, nowMs: number) {
  // Warm walls
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 480);
  wallGrad.addColorStop(0, '#fde6c4');
  wallGrad.addColorStop(1, '#f3c892');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WORLD_WIDTH, 490);

  // Wall wainscoting
  ctx.fillStyle = '#92400e';
  ctx.fillRect(0, 380, WORLD_WIDTH, 105);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 380, WORLD_WIDTH, 105);

  // Wooden floor planks
  ctx.fillStyle = '#d99b66';
  ctx.fillRect(0, 465, WORLD_WIDTH, WORLD_HEIGHT - 465);
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
  ctx.lineWidth = 2;
  for (let y = 490; y < WORLD_HEIGHT; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  // Arched street windows
  for (const wx of [390, 660, 930]) {
    ctx.fillStyle = '#bae6fd';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(wx - 72, 110, 144, 210, [72, 72, 10, 10]);
    ctx.fill();
    ctx.stroke();
    // Window crossbars
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx, 110);
    ctx.lineTo(wx, 320);
    ctx.moveTo(wx - 72, 220);
    ctx.lineTo(wx + 72, 220);
    ctx.stroke();
  }

  // Hanging warm lamps
  const sway = Math.sin(nowMs / 900) * 3;
  for (const lx of [390, 660, 930]) {
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + sway, 95);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lx + sway, 108, 22, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Barista counter on the left
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#291509';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(40, 310, 290, 235, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.roundRect(32, 298, 306, 28, 10);
  ctx.fill();
  ctx.stroke();

  // Espresso machine & cake dome
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.roundRect(75, 225, 85, 73, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(245, 280, 32, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  // Cafe sign
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.roundRect(455, 28, 430, 62, 14);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fef3c7';
  ctx.font = '800 30px "Rubik", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('КАФЕ «ТЁПЛАЯ ЛАПКА»', 670, 59);

  // Cozy round tables on the back floor edge
  for (const [tx, ty] of [
    [470, 445],
    [830, 445],
  ]) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tx - 8, ty - 35, 16, 45);
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(tx, ty - 42, 54, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Coffee cups
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(tx - 20, ty - 58, 16, 15, 4);
    ctx.roundRect(tx + 8, ty - 54, 16, 15, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Exit door on the right
  ctx.fillStyle = '#5c2d16';
  ctx.strokeStyle = '#271207';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(1125, 315, 140, 255, [70, 70, 4, 4]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#bae6fd';
  ctx.beginPath();
  ctx.roundRect(1152, 355, 86, 86, [43, 43, 6, 6]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(1148, 472, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Exit sign
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(1110, 250, 170, 44, 10);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.font = '700 17px "Nunito", sans-serif';
  ctx.fillText('← НА УЛИЦУ', 1195, 272);
}

function drawShopInterior(ctx: CanvasRenderingContext2D, nowMs: number) {
  // Chic boutique backdrop
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 480);
  wallGrad.addColorStop(0, '#eef2ff');
  wallGrad.addColorStop(1, '#ddd6fe');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WORLD_WIDTH, 470);

  // Checkered boutique floor
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 465, WORLD_WIDTH, WORLD_HEIGHT - 465);
  const tileW = 68;
  const tileH = 44;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 22; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(col * tileW, 465 + row * tileH, tileW, tileH);
      }
    }
  }

  // Boutique sign
  ctx.fillStyle = '#312e81';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(450, 26, 448, 72, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px "Rubik", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ БУТИК «DOG STYLE» ★', 674, 62);

  // Clothing racks on left & right
  for (const rx of [160, 1020]) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(rx, 450);
    ctx.lineTo(rx, 240);
    ctx.lineTo(rx + 170, 240);
    ctx.lineTo(rx + 170, 450);
    ctx.stroke();

    const colors = ['#ec4899', '#0d9488', '#f59e0b', '#3b82f6'];
    colors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(rx + 14 + idx * 38, 254, 32, 95, 6);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Interactive Center Catalog Stand (DOG_STYLE_STAND_RECT)
  const { x, y, w, h } = DOG_STYLE_STAND_RECT;
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 400);

  // Arch mirror / fitting booth backdrop
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x + 25, y, w - 50, h - 20, [95, 95, 10, 10]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.roundRect(x + 42, y + 18, w - 84, h - 55, [78, 78, 6, 6]);
  ctx.fill();
  ctx.stroke();

  // Podium
  ctx.fillStyle = '#4f46e5';
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + h - 46, w - 24, 46, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = `rgba(253, 224, 71, ${0.8 + pulse * 0.2})`;
  ctx.font = '800 18px "Rubik", sans-serif';
  ctx.fillText('КАТАЛОГ ОДЕЖДЫ', x + w / 2, y + h - 22);

  // Exit mat at bottom center
  ctx.fillStyle = '#312e81';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(594, 685, 160, 68, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 16px "Nunito", sans-serif';
  ctx.fillText('ВЫХОД НА УЛИЦУ', 674, 720);
}

function drawNextStreet(ctx: CanvasRenderingContext2D, nowMs: number) {
  // Sunny sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 420);
  skyGrad.addColorStop(0, '#7dd3fc');
  skyGrad.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WORLD_WIDTH, 430);

  // Distant pastel skyline
  ctx.fillStyle = '#fed7aa';
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3;
  const buildings = [
    [130, 160, 190, 260, '#fdba74'],
    [350, 120, 210, 300, '#fca5a5'],
    [790, 135, 220, 285, '#fde047'],
    [1040, 165, 210, 255, '#c4b5fd'],
  ] as const;
  for (const [bx, by, bw, bh, color] of buildings) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [14, 14, 0, 0]);
    ctx.fill();
    ctx.stroke();
    // Windows
    ctx.fillStyle = '#e0f2fe';
    for (let wy = by + 32; wy < by + bh - 45; wy += 52) {
      for (let wx = bx + 28; wx < bx + bw - 36; wx += 58) {
        ctx.beginPath();
        ctx.roundRect(wx, wy, 34, 34, 6);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  // Stone plaza floor
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 420, WORLD_WIDTH, WORLD_HEIGHT - 420);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let y = 445; y < WORLD_HEIGHT; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  // Blossom trees
  for (const [tx, ty] of [
    [95, 360],
    [1255, 360],
  ]) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tx - 16, ty - 80, 32, 130);
    ctx.fillStyle = '#f9a8d4';
    ctx.strokeStyle = '#4c1d95';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(tx, ty - 115, 76, 0, Math.PI * 2);
    ctx.arc(tx - 48, ty - 82, 54, 0, Math.PI * 2);
    ctx.arc(tx + 48, ty - 82, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Central Fountain (excluded by walkable polygon around x:520..830, y:420..525)
  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(675, 480, 145, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(675, 476, 122, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Animated water spout
  const spray = Math.sin(nowMs / 240) * 6;
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.moveTo(660, 470);
  ctx.quadraticCurveTo(645, 395 + spray, 610, 465);
  ctx.moveTo(690, 470);
  ctx.quadraticCurveTo(705, 395 - spray, 740, 465);
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Signpost
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(480, 26, 390, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.font = '800 26px "Rubik", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('СОЛНЕЧНЫЙ БУЛЬВАР', 675, 54);

  // Return arrow circle in bottom-left
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(102, 588, 46, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 28px sans-serif';
  ctx.fillText('←', 102, 590);
}

export function drawRoomBackground(
  ctx: CanvasRenderingContext2D,
  room: RoomConfig,
  nowMs: number
): void {
  if (room.bgImage) {
    const img = getBgImage(room.bgImage);
    if (img) {
      ctx.drawImage(img, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      return;
    }
  }

  if (room.id === 'cafe') {
    drawCafeInterior(ctx, nowMs);
  } else if (room.id === 'shop') {
    drawShopInterior(ctx, nowMs);
  } else if (room.id === 'next_street') {
    drawNextStreet(ctx, nowMs);
  } else {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
}

export function drawInteractiveHighlights(
  ctx: CanvasRenderingContext2D,
  room: RoomConfig,
  hoveredEntrance: EntranceZone | null,
  isHoveringCatalogStand: boolean
): void {
  if (hoveredEntrance) {
    const { rect, shape, label } = hoveredEntrance;
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 3.5;

    if (shape === 'circle') {
      ctx.beginPath();
      ctx.ellipse(
        rect.x + rect.w / 2,
        rect.y + rect.h / 2,
        rect.w / 2,
        rect.h / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 12);
      ctx.fill();
      ctx.stroke();
    }

    // Floating tooltip pill
    ctx.font = '700 14px "Nunito", sans-serif';
    const tw = ctx.measureText(label).width + 24;
    const tx = Math.max(12, Math.min(WORLD_WIDTH - tw - 12, rect.x + rect.w / 2 - tw / 2));
    const ty = Math.max(12, rect.y - 42);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx + tw / 2, ty + 16);
    ctx.restore();
  }

  if (room.id === 'shop' && isHoveringCatalogStand) {
    const { x, y, w, h } = DOG_STYLE_STAND_RECT;
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 14px "Nunito", sans-serif';
    const label = 'Открыть каталог одежды';
    const tw = ctx.measureText(label).width + 24;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - tw / 2, y - 40, tw, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y - 24);
    ctx.restore();
  }
}

export function drawZoneEditorOverlay(
  ctx: CanvasRenderingContext2D,
  polygon: Point[],
  entrances: EntranceZone[],
  activeHandleIndex: number | null
): void {
  ctx.save();

  // Walkable polygon fill & outline
  if (polygon.length >= 3) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Polygon vertices
  polygon.forEach((pt, idx) => {
    const isActive = idx === activeHandleIndex;
    ctx.fillStyle = isActive ? '#fbbf24' : '#ffffff';
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isActive ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(idx), pt.x, pt.y - 12);
  });

  // Entrance rectangles
  entrances.forEach((ent) => {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(ent.rect.x, ent.rect.y, ent.rect.w, ent.rect.h);
    ctx.fillRect(ent.rect.x, ent.rect.y, ent.rect.w, ent.rect.h);
    ctx.setLineDash([]);

    // Corner handle for resizing / moving
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(ent.rect.x - 5, ent.rect.y - 5, 12, 12);
    ctx.fillRect(ent.rect.x + ent.rect.w - 7, ent.rect.y + ent.rect.h - 7, 12, 12);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 12px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ent.label, ent.rect.x + 6, ent.rect.y + 18);
  });

  ctx.restore();
}

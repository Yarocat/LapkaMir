import { CharacterConfig, Direction, Outfit, Race } from '../types/game';

const SPRITE_URLS: Record<Direction, string> = {
  0: '/assets/aistudio/______-____________0_45_______3d6e5e0f.png', // Down -> temp Down-Left
  1: '/assets/aistudio/______-____________0_45_______3d6e5e0f.png', // Down-Left
  2: '/assets/aistudio/______-____________045_____________dfc7e62d.png', // Left profile
  3: '/assets/aistudio/______-____________0_45_____________34d392e9.png', // Up-Left
  4: '/assets/aistudio/______-____________045_____________e937b219.png', // Up (strictly back)
  5: '/assets/aistudio/______-____________0_45______________f383cdcb.png', // Up-Right
  6: '/assets/aistudio/______-____________0______________90497d99.png', // Right profile
  7: '/assets/aistudio/______-____________0_45________4a0a373f.png', // Down-Right
};

const spriteCache = new Map<string, HTMLImageElement>();
const tintedCache = new Map<string, HTMLCanvasElement>();

function getBaseSprite(dir: Direction): HTMLImageElement | null {
  const url = SPRITE_URLS[dir];
  let img = spriteCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    spriteCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadDogSprites(): void {
  (Object.keys(SPRITE_URLS) as unknown as Direction[]).forEach((dir) => {
    getBaseSprite(Number(dir) as Direction);
  });
}

function getTintedDogCanvas(dir: Direction, phenotype: string): HTMLCanvasElement | HTMLImageElement | null {
  const base = getBaseSprite(dir);
  if (!base) return null;
  if (phenotype === 'pheno0') return base;

  const key = `${SPRITE_URLS[dir]}_${phenotype}`;
  const cached = tintedCache.get(key);
  if (cached) return cached;

  const off = document.createElement('canvas');
  off.width = base.naturalWidth;
  off.height = base.naturalHeight;
  const octx = off.getContext('2d');
  if (!octx) return base;

  if (phenotype === 'chocolate') {
    octx.filter = 'brightness(0.62) saturate(1.15) hue-rotate(-10deg) contrast(1.08)';
  } else if (phenotype === 'white') {
    octx.filter = 'saturate(0.12) brightness(1.32) contrast(1.04)';
  } else if (phenotype === 'spotted') {
    octx.filter = 'saturate(0.16) brightness(1.26) contrast(1.05)';
  }

  octx.drawImage(base, 0, 0);
  octx.filter = 'none';

  // Add cartoon dalmatian spots clipped to non-transparent pixels for 'spotted'
  if (phenotype === 'spotted') {
    octx.globalCompositeOperation = 'source-atop';
    octx.fillStyle = 'rgba(42, 36, 34, 0.85)';
    const w = off.width;
    const h = off.height;
    const spots = [
      [w * 0.36, h * 0.62, 10, 8],
      [w * 0.61, h * 0.56, 12, 9],
      [w * 0.48, h * 0.72, 9, 7],
      [w * 0.33, h * 0.78, 8, 6],
      [w * 0.66, h * 0.76, 11, 8],
      [w * 0.28, h * 0.24, 11, 9],
      [w * 0.7, h * 0.28, 9, 8],
    ];
    for (const [sx, sy, rx, ry] of spots) {
      octx.beginPath();
      octx.ellipse(sx, sy, rx, ry, 0.3, 0, Math.PI * 2);
      octx.fill();
    }
    octx.globalCompositeOperation = 'source-over';
  }

  tintedCache.set(key, off);
  return off;
}

interface AnimalColors {
  fur: string;
  belly: string;
  earInner: string;
  nose: string;
  outline: string;
}

function getAnimalPalette(race: Race, phenotype: string): AnimalColors {
  if (race === 'cat') {
    switch (phenotype) {
      case 'ginger':
        return { fur: '#e8934b', belly: '#fde8cd', earInner: '#fca5a5', nose: '#fb7185', outline: '#2d1e18' };
      case 'black':
        return { fur: '#343642', belly: '#525566', earInner: '#e2a3b7', nose: '#f472b6', outline: '#14151a' };
      case 'white':
        return { fur: '#f8fafc', belly: '#ffffff', earInner: '#fda4af', nose: '#fb7185', outline: '#2d1e18' };
      default: // gray
        return { fur: '#8f9aa8', belly: '#e2e8f0', earInner: '#f9a8d4', nose: '#f472b6', outline: '#2d1e18' };
    }
  }
  // rabbit
  switch (phenotype) {
    case 'ginger':
      return { fur: '#e59a62', belly: '#fef0e1', earInner: '#fbcfe8', nose: '#f43f5e', outline: '#2d1e18' };
    case 'black':
      return { fur: '#383640', belly: '#575463', earInner: '#f472b6', nose: '#fb7185', outline: '#14151a' };
    case 'white':
      return { fur: '#ffffff', belly: '#fdf2f8', earInner: '#fbcfe8', nose: '#fb7185', outline: '#2d1e18' };
    default: // gray
      return { fur: '#a3abb8', belly: '#f1f5f9', earInner: '#fbcfe8', nose: '#fb7185', outline: '#2d1e18' };
  }
}

function drawProceduralAnimal(
  ctx: CanvasRenderingContext2D,
  race: 'cat' | 'rabbit',
  phenotype: string,
  dir: Direction
) {
  const pal = getAnimalPalette(race, phenotype);
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const isProfile = dir === 2 || dir === 6;
  const facing = dir === 6 || dir === 7 || dir === 5 ? 1 : dir === 2 || dir === 1 || dir === 3 ? -1 : -0.35;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = pal.outline;
  ctx.lineWidth = 4.5;

  // Tail (drawn behind body for front/profile, or overlapping for back)
  const drawTail = () => {
    ctx.fillStyle = pal.fur;
    if (race === 'rabbit') {
      const tx = isProfile ? -facing * 42 : dir === 3 ? 28 : dir === 5 ? -28 : 0;
      const ty = -108;
      ctx.beginPath();
      ctx.arc(tx, ty, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Cat curved tail
      const tailSide = isProfile ? -facing : dir === 1 || dir === 3 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(tailSide * 26, -110);
      ctx.bezierCurveTo(
        tailSide * 88,
        -118,
        tailSide * 102,
        -178,
        tailSide * 74,
        -196
      );
      ctx.bezierCurveTo(
        tailSide * 58,
        -206,
        tailSide * 50,
        -188,
        tailSide * 62,
        -172
      );
      ctx.bezierCurveTo(tailSide * 75, -155, tailSide * 66, -130, tailSide * 26, -124);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  if (!isBack) drawTail();

  // Legs
  if (isProfile) {
    ctx.fillStyle = pal.fur;
    ctx.beginPath();
    ctx.roundRect(-24, -125, 48, 118, 22);
    ctx.fill();
    ctx.stroke();
    // Foot paw forward
    ctx.beginPath();
    ctx.ellipse(facing * 12, -16, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    for (const side of [-1, 1]) {
      ctx.fillStyle = pal.fur;
      ctx.beginPath();
      ctx.roundRect(side * 34 - 22, -130, 44, 118, 20);
      ctx.fill();
      ctx.stroke();
      // Paw foot
      ctx.beginPath();
      ctx.ellipse(side * 36, -16, 26, 15, side * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Arms behind/side of torso
  if (!isProfile) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 46, -242);
      ctx.rotate(side * -0.45);
      ctx.fillStyle = pal.fur;
      ctx.beginPath();
      ctx.roundRect(-16, 0, 32, 108, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Torso
  const torsoW = isProfile ? 76 : 110;
  ctx.fillStyle = pal.fur;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, -264, torsoW, 158, 42);
  ctx.fill();
  ctx.stroke();

  // Belly patch (front & profile)
  if (!isBack) {
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    const bellyShift = isProfile ? facing * 14 : facing * 10;
    ctx.ellipse(bellyShift, -190, isProfile ? 22 : 34, 56, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isBack && dir !== 4) drawTail();

  // Profile arm on top of torso
  if (isProfile) {
    ctx.fillStyle = pal.fur;
    ctx.beginPath();
    ctx.roundRect(-16, -238, 32, 102, 16);
    ctx.fill();
    ctx.stroke();
  }

  // Ears
  const drawEars = () => {
    if (race === 'cat') {
      if (isProfile) {
        ctx.fillStyle = pal.fur;
        ctx.beginPath();
        ctx.moveTo(-facing * 20, -405);
        ctx.lineTo(-facing * 30, -462);
        ctx.lineTo(facing * 12, -422);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        for (const side of [-1, 1]) {
          ctx.fillStyle = pal.fur;
          ctx.beginPath();
          ctx.moveTo(side * 22, -412);
          ctx.lineTo(side * 66, -462);
          ctx.lineTo(side * 72, -392);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          if (!isBack) {
            ctx.fillStyle = pal.earInner;
            ctx.beginPath();
            ctx.moveTo(side * 30, -408);
            ctx.lineTo(side * 58, -445);
            ctx.lineTo(side * 62, -398);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    } else {
      // Rabbit tall ears
      if (isProfile) {
        for (const offset of [-6, 8]) {
          ctx.fillStyle = pal.fur;
          ctx.beginPath();
          ctx.ellipse(-facing * 16 + offset, -465, 16, 56, -facing * 0.14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        for (const side of [-1, 1]) {
          ctx.fillStyle = pal.fur;
          ctx.beginPath();
          ctx.ellipse(side * 36, -466, 20, 56, side * 0.14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (!isBack) {
            ctx.fillStyle = pal.earInner;
            ctx.beginPath();
            ctx.ellipse(side * 36, -464, 10, 38, side * 0.14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  };

  drawEars();

  // Head
  const headW = isProfile ? 132 : 162;
  const headH = 140;
  ctx.fillStyle = pal.fur;
  ctx.beginPath();
  ctx.ellipse(0, -345, headW / 2, headH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Snout / cheeks / eyes for non-back views
  if (!isBack) {
    const shiftX = isProfile ? facing * 42 : facing * 18;
    // Muzzle / cheek cream
    ctx.fillStyle = pal.belly;
    ctx.beginPath();
    ctx.ellipse(shiftX, -322, isProfile ? 30 : 40, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    if (isProfile) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(facing * 32, -352, 11, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(facing * 35, -357, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const side of [-1, 1]) {
        const ex = shiftX * 0.65 + side * 26;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(ex, -350, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 3, -355, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Nose
    ctx.fillStyle = pal.nose;
    ctx.beginPath();
    ctx.ellipse(isProfile ? facing * 62 : shiftX, -330, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = pal.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isProfile) {
      ctx.moveTo(facing * 42, -315);
      ctx.quadraticCurveTo(facing * 54, -310, facing * 60, -318);
    } else {
      ctx.moveTo(shiftX - 12, -317);
      ctx.quadraticCurveTo(shiftX, -309, shiftX + 12, -317);
    }
    ctx.stroke();

    // Whiskers for cat/rabbit
    if (race === 'cat') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = pal.outline;
      const wx = isProfile ? facing * 48 : shiftX;
      const dirs = isProfile ? [facing] : [-1, 1];
      for (const d of dirs) {
        ctx.beginPath();
        ctx.moveTo(wx + d * 18, -326);
        ctx.lineTo(wx + d * 42, -330);
        ctx.moveTo(wx + d * 18, -318);
        ctx.lineTo(wx + d * 42, -316);
        ctx.stroke();
      }
    }
  }
}

// ============================================================================
// 5-LAYER CLOTHING & SHOES RENDERING (1. shoes, 2. bottom, 3. top, 4. hat, 5. accessory)
// All coordinates relative to bottom-center (0, 0) in 267x467 space.
// ============================================================================

function drawShoesLayer(ctx: CanvasRenderingContext2D, shoesId: string, dir: Direction) {
  if (shoesId === 'none') return;

  const isProfile = dir === 2 || dir === 6;
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const facing = dir === 6 || dir === 7 || dir === 5 ? 1 : -1;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1f1612';
  ctx.lineJoin = 'round';

  const drawSingleShoe = (cx: number, cy: number, sideDir: number, w: number, h: number) => {
    if (shoesId === 'sneakers_red') {
      // Red canvas sneakers with white sole & toe cap
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h, w, h, 10);
      ctx.fill();
      ctx.stroke();

      // White sole
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - 9, w, 9, 4);
      ctx.fill();
      ctx.stroke();

      // White toe cap (unless strictly back)
      if (dir !== 4) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(cx + sideDir * (w * 0.25), cy - 11, w * 0.24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (shoesId === 'runners_blue') {
      // Sporty blue running shoes
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 - 2, cy - h - 2, w + 4, h + 2, 12);
      ctx.fill();
      ctx.stroke();

      // Thick cushioned sole
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 - 2, cy - 11, w + 4, 11, 5);
      ctx.fill();
      ctx.stroke();

      // Cyan accent stripe
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.25, cy - h + 8, w * 0.5, 6, 3);
      ctx.fill();
    } else if (shoesId === 'boots_brown') {
      // Tall warm brown boots
      const bootH = h + 24;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 + 2, cy - bootH, w - 4, bootH, 10);
      ctx.fill();
      ctx.stroke();

      // Cuff at top
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - bootH, w, 12, 5);
      ctx.fill();
      ctx.stroke();

      // Dark sole
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - 8, w, 8, 4);
      ctx.fill();
      ctx.stroke();
    } else if (shoesId === 'oxfords_black') {
      // Dark leather boots with laces
      const bootH = h + 10;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - bootH, w, bootH, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 - 1, cy - 8, w + 2, 8, 3);
      ctx.fill();
      ctx.stroke();

      if (!isBack) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy - bootH + 9);
        ctx.lineTo(cx + 7, cy - bootH + 9);
        ctx.moveTo(cx - 7, cy - bootH + 15);
        ctx.lineTo(cx + 7, cy - bootH + 15);
        ctx.stroke();
        ctx.strokeStyle = '#1f1612';
        ctx.lineWidth = 3.5;
      }
    }
  };

  if (isProfile) {
    drawSingleShoe(facing * 6, -4, facing, 64, 30);
  } else if (dir === 0 || dir === 1) {
    drawSingleShoe(-44, -6, -1, 56, 30);
    drawSingleShoe(38, -2, 0.2, 54, 30);
  } else if (dir === 7) {
    drawSingleShoe(-38, -2, -0.2, 54, 30);
    drawSingleShoe(44, -6, 1, 56, 30);
  } else if (dir === 3) {
    drawSingleShoe(-42, -5, -1, 54, 30);
    drawSingleShoe(38, -4, 0.2, 52, 30);
  } else if (dir === 5) {
    drawSingleShoe(-38, -4, -0.2, 52, 30);
    drawSingleShoe(42, -5, 1, 54, 30);
  } else {
    // dir === 4 (strictly back)
    drawSingleShoe(-40, -5, 0, 54, 30);
    drawSingleShoe(40, -5, 0, 54, 30);
  }
}

function drawBottomLayer(ctx: CanvasRenderingContext2D, bottomId: string, dir: Direction) {
  if (bottomId === 'none') return;

  const isProfile = dir === 2 || dir === 6;
  const isBack = dir === 3 || dir === 4 || dir === 5;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1f1612';
  ctx.lineJoin = 'round';

  if (bottomId === 'skirt_fluffy' || bottomId === 'skirt_straight') {
    const isFluffy = bottomId === 'skirt_fluffy';
    ctx.fillStyle = isFluffy ? '#ec4899' : '#312e81';
    const topW = isProfile ? 74 : 112;
    const botW = isFluffy ? (isProfile ? 116 : 162) : (isProfile ? 84 : 124);
    const skirtH = isFluffy ? 78 : 84;
    const topY = -146;

    ctx.beginPath();
    ctx.moveTo(-topW / 2, topY);
    ctx.lineTo(topW / 2, topY);
    ctx.quadraticCurveTo(botW / 2 + 4, topY + skirtH * 0.65, botW / 2, topY + skirtH);
    ctx.quadraticCurveTo(0, topY + skirtH + (isFluffy ? 10 : 4), -botW / 2, topY + skirtH);
    ctx.quadraticCurveTo(-botW / 2 - 4, topY + skirtH * 0.65, -topW / 2, topY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pleats or waistband
    ctx.fillStyle = isFluffy ? '#fbcfe8' : '#818cf8';
    ctx.beginPath();
    ctx.roundRect(-topW / 2, topY, topW, 12, 4);
    ctx.fill();
    ctx.stroke();

    if (isFluffy) {
      ctx.strokeStyle = 'rgba(131, 24, 67, 0.45)';
      ctx.lineWidth = 2.5;
      for (const px of [-26, 0, 26]) {
        ctx.beginPath();
        ctx.moveTo(px * 0.7, topY + 14);
        ctx.lineTo(px * 1.15, topY + skirtH - 4);
        ctx.stroke();
      }
    }
    return;
  }

  // Trousers / Jeans / Shorts
  const isShorts = bottomId === 'shorts_khaki';
  const isJeans = bottomId === 'jeans_blue';
  const fill = isJeans ? '#2b5b84' : isShorts ? '#b48a5a' : '#475569';
  const legLen = isShorts ? 58 : 108;
  const topY = -146;

  ctx.fillStyle = fill;

  if (isProfile) {
    ctx.beginPath();
    ctx.roundRect(-38, topY, 76, legLen, 16);
    ctx.fill();
    ctx.stroke();
  } else {
    // Hip band + two legs
    ctx.beginPath();
    ctx.moveTo(-56, topY);
    ctx.lineTo(56, topY);
    ctx.lineTo(62, topY + legLen);
    ctx.lineTo(14, topY + legLen);
    ctx.lineTo(4, topY + 34);
    ctx.lineTo(-4, topY + 34);
    ctx.lineTo(-14, topY + legLen);
    ctx.lineTo(-62, topY + legLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Belt / denim stitching
  ctx.fillStyle = isJeans ? '#78350f' : '#334155';
  const beltW = isProfile ? 76 : 112;
  ctx.beginPath();
  ctx.roundRect(-beltW / 2, topY, beltW, 13, 4);
  ctx.fill();
  ctx.stroke();

  if (isJeans && !isBack && !isProfile) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-8, topY + 1, 16, 11, 2);
    ctx.fill();
  }
}

function drawTopLayer(ctx: CanvasRenderingContext2D, topId: string, dir: Direction) {
  if (topId === 'none') return;

  const isProfile = dir === 2 || dir === 6;
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const facing = dir === 6 || dir === 7 || dir === 5 ? 1 : -1;

  const paletteMap: Record<string, { main: string; accent: string; sleevesLong: boolean }> = {
    tshirt_teal: { main: '#0d9488', accent: '#fde047', sleevesLong: false },
    hoodie_purple: { main: '#7c3aed', accent: '#ddd6fe', sleevesLong: true },
    jacket_denim: { main: '#b91c1c', accent: '#f8fafc', sleevesLong: true },
    blazer_navy: { main: '#1e3a8a', accent: '#fbbf24', sleevesLong: true },
    sweater_cream: { main: '#ea580c', accent: '#fef3c7', sleevesLong: true },
  };
  const style = paletteMap[topId] ?? paletteMap.tshirt_teal;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1f1612';
  ctx.lineJoin = 'round';

  const topY = -266;
  const torsoH = 128;

  // Sleeves first (behind or beside torso)
  if (!isProfile) {
    const sleeveH = style.sleevesLong ? 88 : 44;
    const sleeveColor = topId === 'jacket_denim' ? '#f8fafc' : style.main;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 46, -252);
      ctx.rotate(side * -0.46);
      ctx.fillStyle = sleeveColor;
      ctx.beginPath();
      ctx.roundRect(-18, 0, 36, sleeveH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Torso body
  const torsoW = isProfile ? 80 : 116;
  ctx.fillStyle = style.main;
  ctx.beginPath();
  ctx.roundRect(-torsoW / 2, topY, torsoW, torsoH, [24, 24, 12, 12]);
  ctx.fill();
  ctx.stroke();

  // Details by garment type & view
  if (topId === 'tshirt_teal' && !isBack && !isProfile) {
    // Yellow star print
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(a) * 18;
      const py = -205 + Math.sin(a) * 18;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (topId === 'hoodie_purple') {
    if (isBack) {
      // Hood resting on back
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.roundRect(-36, topY - 4, 72, 40, 16);
      ctx.fill();
      ctx.stroke();
    } else if (!isProfile) {
      // Kangaroo pocket + drawstrings
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.roundRect(-32, -184, 64, 34, 10);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, topY + 8);
      ctx.lineTo(-10, topY + 34);
      ctx.moveTo(10, topY + 8);
      ctx.lineTo(10, topY + 34);
      ctx.stroke();
      ctx.strokeStyle = '#1f1612';
      ctx.lineWidth = 3.5;
    }
  }

  if (topId === 'jacket_denim' && !isBack && !isProfile) {
    // White zipper / varsity stripe
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.roundRect(-5, topY + 4, 10, torsoH - 8, 3);
    ctx.fill();
    ctx.stroke();
  }

  if (topId === 'blazer_navy' && !isBack && !isProfile) {
    // V-neck shirt & gold buttons
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-22, topY + 2);
    ctx.lineTo(22, topY + 2);
    ctx.lineTo(0, topY + 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = style.accent;
    for (const by of [-202, -176]) {
      ctx.beginPath();
      ctx.arc(0, by, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  if (topId === 'sweater_cream') {
    // Horizontal cream knit stripe
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.roundRect(-torsoW / 2 + 2, -225, torsoW - 4, 22, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Profile sleeve on top of torso
  if (isProfile) {
    const sleeveH = style.sleevesLong ? 84 : 42;
    ctx.fillStyle = topId === 'jacket_denim' ? '#f8fafc' : style.main;
    ctx.beginPath();
    ctx.roundRect(-18 + facing * -2, -242, 36, sleeveH, 12);
    ctx.fill();
    ctx.stroke();
  }
}

function drawHatLayer(ctx: CanvasRenderingContext2D, hatId: string, dir: Direction) {
  if (hatId === 'none') return;

  const isProfile = dir === 2 || dir === 6;
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const facing = dir === 6 || dir === 7 || dir === 5 ? 1 : dir === 2 || dir === 1 || dir === 3 ? -1 : -0.35;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1f1612';
  ctx.lineJoin = 'round';

  if (hatId === 'cap_red') {
    const crownW = isProfile ? 114 : 132;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(0, -412, crownW / 2, 38, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(crownW / 2, -402);
    ctx.lineTo(-crownW / 2, -402);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White front panel
    if (!isBack) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(isProfile ? facing * 26 : facing * 12, -416, 22, 20, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Visor pointing in direction of gaze
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    if (isProfile) {
      ctx.ellipse(facing * 48, -400, 44, 11, facing * 0.12, 0, Math.PI * 2);
    } else if (dir === 4) {
      // Back strap
      ctx.fillStyle = '#f8fafc';
      ctx.roundRect(-24, -408, 48, 10, 4);
    } else if (isBack) {
      ctx.ellipse(facing * 42, -402, 32, 9, facing * 0.1, 0, Math.PI * 2);
    } else {
      ctx.ellipse(facing * 20, -398, 54, 12, facing * 0.12, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  } else if (hatId === 'crown_gold') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-48, -414);
    ctx.lineTo(-56, -464);
    ctx.lineTo(-22, -440);
    ctx.lineTo(0, -472);
    ctx.lineTo(22, -440);
    ctx.lineTo(56, -464);
    ctx.lineTo(48, -414);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gems
    if (!isBack) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -432, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (hatId === 'ushanka_brown') {
    const w = isProfile ? 124 : 154;
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -448, w, 52, 22);
    ctx.fill();
    ctx.stroke();

    // Fluffy fur front & ear flaps
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 10, -424, w - 20, 26, 10);
    ctx.fill();
    ctx.stroke();

    if (!isProfile) {
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.roundRect(side * (w / 2 - 14) - 16, -410, 32, 56, 12);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (hatId === 'glasses_cool') {
    if (isBack) {
      // Subtle strap behind head
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-74, -346);
      ctx.lineTo(74, -346);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = '#0f172a';
    if (isProfile) {
      ctx.beginPath();
      ctx.roundRect(facing > 0 ? 18 : -54, -360, 36, 22, 6);
      ctx.fill();
      ctx.stroke();
      // Temple arm
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(facing > 0 ? 18 : -18, -350);
      ctx.lineTo(facing > 0 ? -24 : 24, -350);
      ctx.stroke();
    } else {
      const shiftX = dir === 7 ? 10 : -10;
      ctx.beginPath();
      ctx.roundRect(shiftX - 54, -360, 46, 24, 7);
      ctx.roundRect(shiftX + 8, -360, 46, 24, 7);
      ctx.fill();
      ctx.stroke();
      // Bridge
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(shiftX - 8, -350);
      ctx.lineTo(shiftX + 8, -350);
      ctx.stroke();
      // Lens shine
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(shiftX - 44, -354);
      ctx.lineTo(shiftX - 30, -344);
      ctx.moveTo(shiftX + 18, -354);
      ctx.lineTo(shiftX + 32, -344);
      ctx.stroke();
    }
  }
}

function drawAccessoryLayer(ctx: CanvasRenderingContext2D, accessoryId: string, dir: Direction) {
  if (accessoryId === 'none') return;

  const isProfile = dir === 2 || dir === 6;
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const facing = dir === 6 || dir === 7 || dir === 5 ? 1 : -1;

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#1f1612';
  ctx.lineJoin = 'round';

  if (accessoryId === 'scarf_red') {
    const w = isProfile ? 80 : 104;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -276, w, 24, 12);
    ctx.fill();
    ctx.stroke();

    // Hanging scarf tail
    if (!isBack) {
      const tx = isProfile ? facing * 22 : 16;
      ctx.beginPath();
      ctx.roundRect(tx - 12, -258, 24, 58, 8);
      ctx.fill();
      ctx.stroke();
    }
  } else if (accessoryId === 'collar_bone') {
    const w = isProfile ? 72 : 96;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -272, w, 15, 7);
    ctx.fill();
    ctx.stroke();

    if (!isBack) {
      const bx = isProfile ? facing * 30 : 0;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(bx - 14, -258, 28, 12, 5);
      ctx.fill();
      ctx.stroke();
      for (const endX of [bx - 14, bx + 14]) {
        ctx.beginPath();
        ctx.arc(endX, -255, 6, 0, Math.PI * 2);
        ctx.arc(endX, -249, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (accessoryId === 'backpack_green') {
    if (isBack) {
      // Full backpack on the back
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-48, -256, 96, 108, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(-36, -200, 72, 42, 12);
      ctx.fill();
      ctx.stroke();
    } else if (isProfile) {
      // Pack bulging behind the character
      const bx = -facing * 42;
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(bx - 20, -252, 40, 102, 14);
      ctx.fill();
      ctx.stroke();
    } else {
      // Front shoulder straps
      ctx.fillStyle = '#15803d';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(side * 34 - 8, -262, 16, 98, 6);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

export interface AvatarRenderParams {
  character: CharacterConfig;
  x: number;
  y: number;
  scale: number;
  direction: Direction;
  isMoving: boolean;
  emote?: string;
  emoteTime?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  nowMs: number;
  isLocalPlayer?: boolean;
  isNpc?: boolean;
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width > maxWidth) {
        // Split very long word
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

export function drawAvatar(ctx: CanvasRenderingContext2D, params: AvatarRenderParams): void {
  const {
    character,
    x,
    y,
    scale,
    direction,
    isMoving,
    emote,
    emoteTime = 0,
    lastMessage,
    lastMessageTime = 0,
    nowMs,
    isLocalPlayer = false,
    isNpc = false,
  } = params;

  const t = nowMs / 1000;
  const emoteAge = nowMs - emoteTime;
  const emoteActive = Boolean(emote && emoteAge >= 0 && emoteAge < 3200);

  // Walk bounce & sway vs Idle breathing
  let bounceY = 0;
  let tiltRad = 0;
  let breatheY = 1;

  if (isMoving) {
    bounceY = -Math.abs(Math.sin(t * 11)) * 16 * scale;
    tiltRad = Math.sin(t * 11) * 0.055;
  } else {
    breatheY = 1 + Math.sin(t * 2.8 + x * 0.01) * 0.024;
  }

  if (emoteActive) {
    if (emote === 'dance') {
      bounceY -= Math.abs(Math.sin(t * 13)) * 22 * scale;
      tiltRad = Math.sin(t * 13) * 0.16;
    } else if (emote === 'laugh') {
      bounceY -= Math.abs(Math.sin(t * 18)) * 12 * scale;
    } else if (emote === 'wave') {
      tiltRad = Math.sin(t * 10) * 0.09;
    }
  }

  // 1. Ground shadow
  ctx.save();
  ctx.translate(x, y);
  const shadowScale = isMoving ? 0.92 : 1;
  ctx.fillStyle = isLocalPlayer ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 56 * scale * shadowScale, 18 * scale * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isLocalPlayer) {
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Character body + 5-layer outfit
  ctx.save();
  ctx.translate(x, y + bounceY);
  ctx.rotate(tiltRad);
  ctx.scale(scale, scale * breatheY);

  if (character.race === 'dog') {
    const sprite = getTintedDogCanvas(direction, character.phenotype);
    if (sprite) {
      const w = sprite instanceof HTMLImageElement ? sprite.naturalWidth : sprite.width;
      const h = sprite instanceof HTMLImageElement ? sprite.naturalHeight : sprite.height;
      // Draw sprite normalized to 267x467 anchor
      const normW = (w / h) * 467;
      ctx.drawImage(sprite, -normW / 2, -467, normW, 467);
    }
  } else {
    drawProceduralAnimal(ctx, character.race, character.phenotype, direction);
  }

  // Strict 5-layer order bottom-to-top: 1. shoes -> 2. bottom -> 3. top -> 4. hat -> 5. accessory
  const outfit: Outfit = character.outfit;
  drawShoesLayer(ctx, outfit.shoes, direction);
  drawBottomLayer(ctx, outfit.bottom, direction);
  drawTopLayer(ctx, outfit.top, direction);
  drawHatLayer(ctx, outfit.hat, direction);
  drawAccessoryLayer(ctx, outfit.accessory, direction);

  ctx.restore();

  // 3. Emote floating badge
  if (emoteActive) {
    const emojiMap: Record<string, string> = {
      wave: '👋',
      heart: '❤️',
      laugh: '😂',
      dance: '💃',
    };
    const symbol = emojiMap[emote ?? ''] ?? '✨';
    const progress = emoteAge / 3200;
    const floatY = y - 495 * scale - progress * 26;
    ctx.save();
    ctx.globalAlpha = progress > 0.75 ? (1 - progress) * 4 : 1;
    ctx.font = `${Math.round(30 * Math.max(0.75, scale * 2))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(symbol, x, floatY);
    ctx.restore();
  }

  // 4. Nickname plate under feet
  ctx.save();
  const labelText = isNpc ? `★ ${character.name}` : character.name;
  ctx.font = '700 13px "Nunito", sans-serif';
  const textW = ctx.measureText(labelText).width;
  const pillW = textW + 18;
  const pillH = 22;
  const pillY = y + 12;

  ctx.fillStyle = isNpc
    ? 'rgba(245, 158, 11, 0.94)'
    : isLocalPlayer
    ? 'rgba(15, 23, 42, 0.86)'
    : 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = isNpc ? '#78350f' : isLocalPlayer ? '#fbbf24' : '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - pillW / 2, pillY, pillW, pillH, 999);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isNpc ? '#1e1b4b' : isLocalPlayer ? '#ffffff' : '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, x, pillY + pillH / 2 + 0.5);
  ctx.restore();

  // 5. Speech Bubble (visible for 6 seconds)
  const msgAge = nowMs - lastMessageTime;
  if (lastMessage && msgAge >= 0 && msgAge < 6000) {
    ctx.save();
    const fadeAlpha = msgAge > 5300 ? Math.max(0, (6000 - msgAge) / 700) : 1;
    ctx.globalAlpha = fadeAlpha;
    ctx.font = '600 13.5px "Nunito", sans-serif';
    const maxBubbleW = 220;
    const lines = wrapTextLines(ctx, lastMessage, maxBubbleW - 24);
    const lineH = 18;
    const contentW = Math.max(
      48,
      ...lines.map((l) => ctx.measureText(l).width)
    );
    const bubbleW = Math.min(maxBubbleW, contentW + 24);
    const bubbleH = lines.length * lineH + 18;
    const bubbleX = Math.max(12, Math.min(1348 - bubbleW - 12, x - bubbleW / 2));
    const headTopY = y - 485 * scale;
    const bubbleY = Math.max(12, headTopY - bubbleH - 18);

    // Bubble shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.beginPath();
    ctx.roundRect(bubbleX + 2, bubbleY + 3, bubbleW, bubbleH, 14);
    ctx.fill();

    // Comic bubble body
    ctx.fillStyle = isNpc ? '#fffbeb' : '#ffffff';
    ctx.strokeStyle = isNpc ? '#b45309' : '#1e293b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 14);
    ctx.fill();
    ctx.stroke();

    // Tail triangle pointing toward head
    const tipX = Math.max(bubbleX + 16, Math.min(bubbleX + bubbleW - 16, x));
    ctx.fillStyle = isNpc ? '#fffbeb' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tipX - 8, bubbleY + bubbleH - 1);
    ctx.lineTo(tipX, bubbleY + bubbleH + 10);
    ctx.lineTo(tipX + 8, bubbleY + bubbleH - 1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tipX - 8, bubbleY + bubbleH);
    ctx.lineTo(tipX, bubbleY + bubbleH + 10);
    ctx.lineTo(tipX + 8, bubbleY + bubbleH);
    ctx.stroke();

    // Bubble text
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((line, idx) => {
      ctx.fillText(line, bubbleX + 12, bubbleY + 10 + idx * lineH);
    });

    ctx.restore();
  }
}

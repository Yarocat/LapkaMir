import { Direction, Point, RoomConfig } from '../types/game';

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };
}

export function getPolygonCentroid(polygon: Point[]): Point {
  if (polygon.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const p of polygon) {
    sumX += p.x;
    sumY += p.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
}

export function clampPointToPolygon(target: Point, polygon: Point[]): Point {
  if (polygon.length < 3) return target;
  if (pointInPolygon(target, polygon)) return target;

  let bestPoint = polygon[0];
  let bestDistSq = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const candidate = closestPointOnSegment(target, a, b);
    const dx = target.x - candidate.x;
    const dy = target.y - candidate.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestPoint = candidate;
    }
  }

  // Nudge slightly toward polygon centroid so the clamped point sits cleanly inside
  const centroid = getPolygonCentroid(polygon);
  const toCenterX = centroid.x - bestPoint.x;
  const toCenterY = centroid.y - bestPoint.y;
  const dist = Math.hypot(toCenterX, toCenterY) || 1;
  const nudged = {
    x: Math.round(bestPoint.x + (toCenterX / dist) * 2),
    y: Math.round(bestPoint.y + (toCenterY / dist) * 2),
  };
  return pointInPolygon(nudged, polygon) ? nudged : { x: Math.round(bestPoint.x), y: Math.round(bestPoint.y) };
}

/**
 * Computes 8-sector direction (45 deg per sector) from movement vector (dx, dy)
 * 0 = Down (+Y), 1 = Down-Left, 2 = Left (-X), 3 = Up-Left,
 * 4 = Up (-Y), 5 = Up-Right, 6 = Right (+X), 7 = Down-Right
 */
export function computeDirection(dx: number, dy: number): Direction {
  const angleRad = Math.atan2(dy, dx); // 0 = Right, PI/2 = Down, PI/-PI = Left, -PI/2 = Up
  let deg = (angleRad * 180) / Math.PI;
  // Shift so 0 deg is Down (+90 in standard atan2)
  deg = (deg - 90 + 360) % 360;
  // Clockwise from Down:
  // 0: Down (0° ± 22.5°)
  // 1: Down-Left (45°)
  // 2: Left (90°)
  // 3: Up-Left (135°)
  // 4: Up (180°)
  // 5: Up-Right (225°)
  // 6: Right (270°)
  // 7: Down-Right (315°)
  const sector = Math.round(deg / 45) % 8;
  return sector as Direction;
}

export function getScaleForY(y: number, room: RoomConfig): number {
  const { minY, maxY, minScale, maxScale } = room.scaleRange;
  const t = Math.max(0, Math.min(1, (y - minY) / Math.max(1, maxY - minY)));
  return minScale + t * (maxScale - minScale);
}

export function pointInRect(
  p: Point,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
}

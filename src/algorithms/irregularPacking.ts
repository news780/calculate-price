import { rotateDieline } from './dielines';
import type { DieLineGeometry, LayoutOrientation, PaperSettings, Point, ShapePlacement } from '../types/layout';

const DEFAULT_MAX_RUNTIME_MS = 500;
const DEFAULT_MAX_CANDIDATES = 5000;
const DEFAULT_MAX_ATTEMPTS = 10000;
const DEFAULT_MAX_PIECES = 200;

type PackStopReason = 'complete' | 'timeout' | 'candidate-limit' | 'attempt-limit' | 'max-pieces';

interface PackOptions {
  paper: PaperSettings;
  dieline: DieLineGeometry;
  allowRotate: boolean;
  maxPieces?: number;
  maxRuntimeMs?: number;
  maxCandidates?: number;
  maxAttempts?: number;
}

interface CandidatePack {
  orientation: LayoutOrientation;
  dieline: DieLineGeometry;
  placements: ShapePlacement[];
  count: number;
  reason: PackStopReason;
  attempts: number;
  candidates: number;
}

function usablePaper(paper: PaperSettings) {
  return {
    minX: paper.margin,
    minY: paper.margin,
    maxX: paper.width - paper.margin,
    maxY: paper.height - paper.margin,
    width: paper.width - paper.margin * 2,
    height: paper.height - paper.margin * 2,
  };
}

function boxesOverlap(a: ShapePlacement, b: ShapePlacement, gap: number): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

function translateOutline(dieline: DieLineGeometry, placement: ShapePlacement): Point[] {
  return dieline.outline.map((point) => ({
    x: point.x + placement.x,
    y: point.y + placement.y,
  }));
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;

    if (crossesY) {
      const xAtY = ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

      if (point.x < xAtY) {
        inside = !inside;
      }
    }
  }

  return inside;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  return o1 * o2 < 0 && o3 * o4 < 0;
}

function edgesIntersect(first: Point[], second: Point[]): boolean {
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstNext = (firstIndex + 1) % first.length;

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondNext = (secondIndex + 1) % second.length;

      if (segmentsIntersect(first[firstIndex], first[firstNext], second[secondIndex], second[secondNext])) {
        return true;
      }
    }
  }

  return false;
}

export function doPolygonsOverlap(first: Point[], second: Point[]): boolean {
  return (
    first.some((point) => pointInPolygon(point, second)) ||
    second.some((point) => pointInPolygon(point, first)) ||
    edgesIntersect(first, second)
  );
}

function shapesOverlap(
  candidate: ShapePlacement,
  placed: ShapePlacement,
  candidateDieline: DieLineGeometry,
  placedDieline: DieLineGeometry,
  gap: number,
): boolean {
  if (!boxesOverlap(candidate, placed, gap)) {
    return false;
  }

  return doPolygonsOverlap(
    translateOutline(candidateDieline, candidate),
    translateOutline(placedDieline, placed),
  );
}

function makePlacement(index: number, x: number, y: number, dieline: DieLineGeometry): ShapePlacement {
  return {
    index,
    x,
    y,
    width: dieline.width,
    height: dieline.height,
  };
}

function clampPositiveLimit(value: number | undefined, defaultValue: number, hardLimit: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return defaultValue;
  }

  return Math.min(Math.floor(value), hardLimit);
}

function nowMs(): number {
  return performance.now();
}

function hasRuntimeExpired(startedAt: number, maxRuntimeMs: number): boolean {
  return nowMs() - startedAt >= maxRuntimeMs;
}

function generateGridCandidates(
  paper: PaperSettings,
  dieline: DieLineGeometry,
  maxCandidates: number,
): { candidates: ShapePlacement[]; reason: PackStopReason | null } {
  const usable = usablePaper(paper);
  const candidates: ShapePlacement[] = [];
  const gap = Math.max(0, paper.gap);
  const stepX = dieline.width + gap;
  const stepY = dieline.height + gap;

  if (
    dieline.width <= 0 ||
    dieline.height <= 0 ||
    stepX <= 0 ||
    stepY <= 0 ||
    dieline.width > usable.width ||
    dieline.height > usable.height
  ) {
    return { candidates, reason: 'complete' };
  }

  for (let y = usable.minY; y + dieline.height <= usable.maxY; y += stepY) {
    for (let x = usable.minX; x + dieline.width <= usable.maxX; x += stepX) {
      if (candidates.length >= maxCandidates) {
        return { candidates, reason: 'candidate-limit' };
      }

      candidates.push(makePlacement(candidates.length + 1, x, y, dieline));
    }
  }

  return { candidates, reason: null };
}

function packCandidate(
  paper: PaperSettings,
  dieline: DieLineGeometry,
  orientation: LayoutOrientation,
  maxPieces: number,
  maxRuntimeMs: number,
  maxCandidates: number,
  maxAttempts: number,
  startedAt: number,
): CandidatePack {
  const generated = generateGridCandidates(paper, dieline, maxCandidates);
  const placements: ShapePlacement[] = [];
  let attempts = 0;
  let reason = generated.reason ?? 'complete';

  for (const candidate of generated.candidates) {
    if (hasRuntimeExpired(startedAt, maxRuntimeMs)) {
      reason = 'timeout';
      break;
    }

    if (attempts >= maxAttempts) {
      reason = 'attempt-limit';
      break;
    }

    if (placements.length >= maxPieces) {
      reason = 'max-pieces';
      break;
    }

    attempts += 1;
    const indexedCandidate = { ...candidate, index: placements.length + 1 };
    const hasCollision = placements.some((placed) => shapesOverlap(indexedCandidate, placed, dieline, dieline, paper.gap));

    if (!hasCollision) {
      placements.push(indexedCandidate);
    }
  }

  if (placements.length >= maxPieces && reason === 'complete') {
    reason = 'max-pieces';
  }

  return {
    orientation,
    dieline,
    placements,
    count: placements.length,
    reason,
    attempts,
    candidates: generated.candidates.length,
  };
}

export function packDielineOnPaper(options: PackOptions): CandidatePack {
  const maxPieces = clampPositiveLimit(options.maxPieces, DEFAULT_MAX_PIECES, DEFAULT_MAX_PIECES);
  const maxRuntimeMs = clampPositiveLimit(options.maxRuntimeMs, DEFAULT_MAX_RUNTIME_MS, DEFAULT_MAX_RUNTIME_MS);
  const maxCandidates = clampPositiveLimit(options.maxCandidates, DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_CANDIDATES);
  const maxAttempts = clampPositiveLimit(options.maxAttempts, DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  const startedAt = nowMs();
  const candidates = [
    packCandidate(options.paper, options.dieline, 'original', maxPieces, maxRuntimeMs, maxCandidates, maxAttempts, startedAt),
  ];

  if (options.allowRotate) {
    candidates.push(
      packCandidate(options.paper, rotateDieline(options.dieline), 'rotated', maxPieces, maxRuntimeMs, maxCandidates, maxAttempts, startedAt),
    );
  }

  return candidates.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const leftArea = left.count * left.dieline.area;
    const rightArea = right.count * right.dieline.area;
    return rightArea - leftArea;
  })[0];
}

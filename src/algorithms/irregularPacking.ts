import { rotateDieline } from './dielines';
import type { DieLineGeometry, LayoutOrientation, PaperSettings, Point, ShapePlacement } from '../types/layout';

const DEFAULT_SCAN_STEP = 6;
const MAX_SCAN_ATTEMPTS = 80000;

interface PackOptions {
  paper: PaperSettings;
  dieline: DieLineGeometry;
  allowRotate: boolean;
  maxPieces?: number;
}

interface CandidatePack {
  orientation: LayoutOrientation;
  dieline: DieLineGeometry;
  placements: ShapePlacement[];
  count: number;
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

  for (let currentIndex = 0, previousIndex = polygon.length - 1; currentIndex < polygon.length; previousIndex = currentIndex) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const crossesY = current.y > point.y !== previous.y > point.y;
    const xAtY = ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;

    if (crossesY && point.x < xAtY) {
      inside = !inside;
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

function packCandidate(
  paper: PaperSettings,
  dieline: DieLineGeometry,
  orientation: LayoutOrientation,
  maxPieces: number,
): CandidatePack {
  const usable = usablePaper(paper);
  const step = Math.max(DEFAULT_SCAN_STEP, paper.gap || DEFAULT_SCAN_STEP);
  const placements: ShapePlacement[] = [];
  let attempts = 0;

  for (
    let y = usable.minY;
    y + dieline.height <= usable.maxY && attempts < MAX_SCAN_ATTEMPTS && placements.length < maxPieces;
    y += step
  ) {
    for (
      let x = usable.minX;
      x + dieline.width <= usable.maxX && attempts < MAX_SCAN_ATTEMPTS && placements.length < maxPieces;
      x += step
    ) {
      attempts += 1;
      const candidate = makePlacement(placements.length + 1, x, y, dieline);
      const hasCollision = placements.some((placed) => shapesOverlap(candidate, placed, dieline, dieline, paper.gap));

      if (!hasCollision) {
        placements.push(candidate);
      }
    }
  }

  return {
    orientation,
    dieline,
    placements,
    count: placements.length,
  };
}

export function packDielineOnPaper(options: PackOptions): CandidatePack {
  const maxPieces = options.maxPieces ?? 1000;
  const candidates = [
    packCandidate(options.paper, options.dieline, 'original', maxPieces),
  ];

  if (options.allowRotate) {
    candidates.push(packCandidate(options.paper, rotateDieline(options.dieline), 'rotated', maxPieces));
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

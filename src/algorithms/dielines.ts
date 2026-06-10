import type { DieLineGeometry, FoldLine, Point } from '../types/layout';

const STRAIGHT_TUCK_FLAP_RATIO = 1.24;
const GLUE_FLAP_MINIMUM = 12;
const FOLD_LINE_INSET = 0;
const DEFAULT_STROKE_PRECISION = 2;

export interface StraightTuckDielineInput {
  length: number;
  width: number;
  height: number;
  thickness?: number;
}

function round(value: number): number {
  return Number(value.toFixed(DEFAULT_STROKE_PRECISION));
}

function point(x: number, y: number): Point {
  return { x: round(x), y: round(y) };
}

function pointsToPath(points: Point[], close = true): string {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  const commands = [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`];
  rest.forEach((item) => commands.push(`L ${item.x.toFixed(2)} ${item.y.toFixed(2)}`));

  if (close) {
    commands.push('Z');
  }

  return commands.join(' ');
}

function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  const signedArea = points.reduce((sum, current, index) => {
    const next = points[(index + 1) % points.length];
    return sum + current.x * next.y - next.x * current.y;
  }, 0);

  return Math.abs(signedArea) / 2;
}

function normalizePoints(points: Point[]): { points: Point[]; width: number; height: number } {
  const minX = Math.min(...points.map((item) => item.x));
  const minY = Math.min(...points.map((item) => item.y));
  const normalized = points.map((item) => point(item.x - minX, item.y - minY));
  const width = Math.max(...normalized.map((item) => item.x));
  const height = Math.max(...normalized.map((item) => item.y));

  return { points: normalized, width, height };
}

export function createRectangleDieline(width: number, height: number): DieLineGeometry {
  const outline = [point(0, 0), point(width, 0), point(width, height), point(0, height)];

  return {
    kind: 'rectangle',
    width,
    height,
    area: width * height,
    outline,
    cutPath: pointsToPath(outline),
    foldLines: [],
  };
}

export function createStraightTuckDieline(input: StraightTuckDielineInput): DieLineGeometry {
  const thickness = input.thickness ?? 0.5;
  const glueFlap = GLUE_FLAP_MINIMUM + thickness * 5;
  const tuckDepth = input.width * STRAIGHT_TUCK_FLAP_RATIO;
  const dustDepth = tuckDepth * 0.82;
  const bodyTop = tuckDepth;
  const bodyBottom = bodyTop + input.height;
  const totalHeight = input.height + tuckDepth * 2;

  const x0 = 0;
  const x1 = glueFlap;
  const x2 = x1 + input.length;
  const x3 = x2 + input.width;
  const x4 = x3 + input.length;
  const x5 = x4 + input.width;
  const dustInset = Math.min(input.width * 0.18, 14);
  const glueInset = Math.min(glueFlap * 0.45, 7);

  const outline = [
    point(x0, bodyTop + glueInset),
    point(x1, bodyTop),
    point(x1, 0),
    point(x2, 0),
    point(x2, bodyTop),
    point(x3 - dustInset, bodyTop - dustDepth),
    point(x3, bodyTop),
    point(x4, bodyTop),
    point(x4 + dustInset, bodyTop - dustDepth),
    point(x5, bodyTop),
    point(x5, bodyBottom),
    point(x4 + dustInset, bodyBottom + dustDepth),
    point(x4, bodyBottom),
    point(x3, bodyBottom),
    point(x3 - dustInset, bodyBottom + dustDepth),
    point(x2, bodyBottom),
    point(x2, totalHeight),
    point(x1, totalHeight),
    point(x1, bodyBottom),
    point(x0, bodyBottom - glueInset),
  ];

  const rawFoldLines: FoldLine[] = [
    { x1, y1: bodyTop, x2: x5, y2: bodyTop, kind: 'fold' },
    { x1, y1: bodyBottom, x2: x5, y2: bodyBottom, kind: 'fold' },
    { x1, y1: bodyTop, x2: x1, y2: bodyBottom, kind: 'fold' },
    { x1: x2, y1: FOLD_LINE_INSET, x2, y2: totalHeight, kind: 'fold' },
    { x1: x3, y1: bodyTop, x2: x3, y2: bodyBottom, kind: 'fold' },
    { x1: x4, y1: bodyTop, x2: x4, y2: bodyBottom, kind: 'fold' },
  ];
  const foldLines: FoldLine[] = rawFoldLines.map((line): FoldLine => ({
    ...line,
    x1: round(line.x1),
    y1: round(line.y1),
    x2: round(line.x2),
    y2: round(line.y2),
  }));

  return {
    kind: 'straightTuck',
    width: round(x5),
    height: round(totalHeight),
    area: calculatePolygonArea(outline),
    outline,
    cutPath: pointsToPath(outline),
    foldLines,
  };
}

export function rotateDieline(dieline: DieLineGeometry): DieLineGeometry {
  const rotatedOutline = dieline.outline.map((item) => point(dieline.height - item.y, item.x));
  const normalized = normalizePoints(rotatedOutline);
  const foldLines = dieline.foldLines.map((line) => {
    const start = point(dieline.height - line.y1, line.x1);
    const end = point(dieline.height - line.y2, line.x2);

    return {
      x1: round(start.x),
      y1: round(start.y),
      x2: round(end.x),
      y2: round(end.y),
      kind: line.kind,
    };
  });

  return {
    ...dieline,
    width: normalized.width,
    height: normalized.height,
    outline: normalized.points,
    cutPath: pointsToPath(normalized.points),
    foldLines,
  };
}

export function translatePath(path: string, x: number, y: number): string {
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) ${path}`;
}

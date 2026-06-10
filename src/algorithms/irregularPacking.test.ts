import { describe, expect, it } from 'vitest';
import { createStraightTuckDieline } from './dielines';
import { doPolygonsOverlap, packDielineOnPaper } from './irregularPacking';
import type { ShapePlacement } from '../types/layout';

function placementsAabbOverlap(first: ShapePlacement, second: ShapePlacement, gap: number): boolean {
  return !(
    first.x + first.width + gap <= second.x ||
    second.x + second.width + gap <= first.x ||
    first.y + first.height + gap <= second.y ||
    second.y + second.height + gap <= first.y
  );
}

describe('irregular dieline packing', () => {
  it('does not report collision when bounding boxes overlap but polygons do not', () => {
    const lowerLeftTriangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    const upperRightTriangle = [
      { x: 100, y: 100 },
      { x: 100, y: 60 },
      { x: 60, y: 100 },
    ];

    expect(doPolygonsOverlap(lowerLeftTriangle, upperRightTriangle)).toBe(false);
  });

  it('reports collision when two polygons share filled area', () => {
    const first = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    const second = [
      { x: 30, y: 30 },
      { x: 90, y: 30 },
      { x: 30, y: 90 },
    ];

    expect(doPolygonsOverlap(first, second)).toBe(true);
  });

  it('packs generated dielines inside the usable paper area', () => {
    const dieline = createStraightTuckDieline({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
    });

    const result = packDielineOnPaper({
      paper: { width: 787, height: 1092, margin: 10, gap: 3 },
      dieline,
      allowRotate: true,
      maxPieces: 200,
    });

    expect(result.count).toBeGreaterThan(0);
    expect(result.placements.every((placement) => placement.x >= 10 && placement.y >= 10)).toBe(true);
    expect(result.placements.every((placement) => placement.x + placement.width <= 777)).toBe(true);
    expect(result.placements.every((placement) => placement.y + placement.height <= 1082)).toBe(true);
  });

  it('returns quickly for large paper and clamps very high maxPieces requests', () => {
    const dieline = createStraightTuckDieline({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
    });
    const startedAt = performance.now();

    const result = packDielineOnPaper({
      paper: { width: 100000, height: 100000, margin: 10, gap: 3 },
      dieline,
      allowRotate: true,
      maxPieces: 100000,
      maxRuntimeMs: 500,
      maxCandidates: 5000,
      maxAttempts: 10000,
    });

    expect(performance.now() - startedAt).toBeLessThan(1000);
    expect(result.reason).toBeDefined();
    expect(result.count).toBeLessThanOrEqual(200);
  });

  it('stops at candidate limits without producing out-of-bounds or overlapping placements', () => {
    const dieline = createStraightTuckDieline({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
    });
    const paper = { width: 2000, height: 2000, margin: 10, gap: 3 };

    const result = packDielineOnPaper({
      paper,
      dieline,
      allowRotate: false,
      maxPieces: 200,
      maxRuntimeMs: 500,
      maxCandidates: 8,
      maxAttempts: 10000,
    });

    expect(result.reason).toBe('candidate-limit');
    expect(result.count).toBeLessThanOrEqual(200);
    expect(result.placements.every((placement) => placement.x >= paper.margin && placement.y >= paper.margin)).toBe(true);
    expect(
      result.placements.every(
        (placement) =>
          placement.x + placement.width <= paper.width - paper.margin &&
          placement.y + placement.height <= paper.height - paper.margin,
      ),
    ).toBe(true);

    for (let firstIndex = 0; firstIndex < result.placements.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < result.placements.length; secondIndex += 1) {
        expect(placementsAabbOverlap(result.placements[firstIndex], result.placements[secondIndex], paper.gap)).toBe(false);
      }
    }
  });
});

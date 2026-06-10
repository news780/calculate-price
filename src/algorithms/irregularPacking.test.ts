import { describe, expect, it } from 'vitest';
import { createStraightTuckDieline } from './dielines';
import { doPolygonsOverlap, packDielineOnPaper } from './irregularPacking';

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
});

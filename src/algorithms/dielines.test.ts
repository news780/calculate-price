import { describe, expect, it } from 'vitest';
import { createRectangleDieline, createStraightTuckDieline, rotateDieline } from './dielines';

describe('dieline generation', () => {
  it('creates a rectangle dieline for legacy unfolded dimensions', () => {
    const dieline = createRectangleDieline(180, 120);

    expect(dieline.width).toBe(180);
    expect(dieline.height).toBe(120);
    expect(dieline.outline).toHaveLength(4);
    expect(dieline.cutPath).toContain('L 180.00 120.00');
  });

  it('creates a straight tuck dieline from length width height', () => {
    const dieline = createStraightTuckDieline({
      length: 120,
      width: 60,
      height: 160,
      thickness: 0.5,
    });

    expect(dieline.kind).toBe('straightTuck');
    expect(dieline.width).toBeCloseTo(374.5, 1);
    expect(dieline.height).toBeCloseTo(308.8, 1);
    expect(dieline.foldLines.length).toBeGreaterThan(5);
    expect(dieline.outline.length).toBeGreaterThan(10);
  });

  it('rotates dieline geometry around its bounding box', () => {
    const dieline = createRectangleDieline(100, 60);
    const rotated = rotateDieline(dieline);

    expect(rotated.width).toBe(60);
    expect(rotated.height).toBe(100);
    expect(rotated.outline).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 60, y: 100 },
      ]),
    );
  });
});

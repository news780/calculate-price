import { describe, expect, it } from 'vitest';
import {
  calculateBestLayout,
  calculateOversizedPackageLayout,
  calculateSinglePackageLayout,
  generateGridPositions,
} from './layout';
import type { PackageInput, PaperSettings } from '../types/layout';

const paper: PaperSettings = {
  width: 100,
  height: 80,
  margin: 5,
  gap: 2,
};

describe('layout algorithms', () => {
  it('calculates adjacent gap only between pieces', () => {
    const result = calculateSinglePackageLayout(paper, {
      id: 'p1',
      name: '小盒',
      inputMode: 'rectangle',
      width: 20,
      height: 10,
      targetQuantity: null,
      allowRotate: false,
    });

    expect(result.count).toBe(24);
    expect(result.cols).toBe(4);
    expect(result.rows).toBe(6);
    expect(result.utilization).toBeCloseTo(0.7619, 4);
  });

  it('chooses the rotated orientation when it produces more pieces', () => {
    const result = calculateBestLayout(paper, {
      id: 'p2',
      name: '竖版盒',
      inputMode: 'rectangle',
      width: 48,
      height: 20,
      targetQuantity: 20,
      allowRotate: true,
    });

    expect(result.mode).toBe('normal');
    if (result.mode === 'normal') {
      expect(result.orientation).toBe('rotated');
      expect(result.count).toBe(4);
      expect(result.requiredSheetsForTarget).toBe(5);
    }
  });

  it('returns oversized tiling instead of a zero-count layout', () => {
    const result = calculateBestLayout(paper, {
      id: 'p3',
      name: '超大盒',
      inputMode: 'rectangle',
      width: 200,
      height: 90,
      targetQuantity: 2,
      allowRotate: true,
    });

    expect(result.mode).toBe('oversized');
    if (result.mode === 'oversized') {
      expect(result.sheetsPerBox).toBe(3);
      expect(result.tilesX).toBe(1);
      expect(result.tilesY).toBe(3);
      expect(result.requiredSheetsForTarget).toBe(6);
    }
  });

  it('calculates oversized layout without rotation when rotation is disabled', () => {
    const packageInput: PackageInput = {
      id: 'p4',
      name: '固定方向超大盒',
      inputMode: 'rectangle',
      width: 190,
      height: 140,
      targetQuantity: null,
      allowRotate: false,
    };

    const result = calculateOversizedPackageLayout(paper, packageInput);

    expect(result.tilesX).toBe(3);
    expect(result.tilesY).toBe(2);
    expect(result.sheetsPerBox).toBe(6);
    expect(result.orientation).toBe('original');
  });

  it('generates grid positions from the selected normal layout', () => {
    const layout = calculateSinglePackageLayout(paper, {
      id: 'p5',
      name: '定位盒',
      inputMode: 'rectangle',
      width: 30,
      height: 20,
      targetQuantity: null,
      allowRotate: false,
    });

    const positions = generateGridPositions(layout);

    expect(positions).toHaveLength(layout.count);
    expect(positions[0]).toMatchObject({ x: 5, y: 5, width: 30, height: 20 });
    expect(positions[1]).toMatchObject({ x: 37, y: 5, width: 30, height: 20 });
  });
});

import { describe, expect, it } from 'vitest';
import { parseCalculatorInputs } from './validation';

describe('parseCalculatorInputs', () => {
  it('returns parsed numeric values for valid form input', () => {
    const result = parseCalculatorInputs(
      { width: '787', height: '1092', margin: '10', gap: '3' },
      [
        {
          id: 'pkg-1',
          name: 'A款',
          inputMode: 'rectangle',
          width: '120',
          height: '80',
          boxLength: '',
          boxWidth: '',
          boxHeight: '',
          thickness: '',
          targetQuantity: '200',
          allowRotate: true,
        },
      ],
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paper.width).toBe(787);
      expect(result.packages[0].targetQuantity).toBe(200);
    }
  });

  it('rejects invalid dimensions without throwing', () => {
    const result = parseCalculatorInputs(
      { width: '', height: '1000', margin: '-1', gap: 'x' },
      [
        {
          id: 'pkg-1',
          name: '',
          inputMode: 'rectangle',
          width: '0',
          height: 'bad',
          boxLength: '',
          boxWidth: '',
          boxHeight: '',
          thickness: '',
          targetQuantity: '2.5',
          allowRotate: false,
        },
      ],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field)).toEqual(
        expect.arrayContaining([
          'paper.width',
          'paper.margin',
          'paper.gap',
          'packages.pkg-1.name',
          'packages.pkg-1.width',
          'packages.pkg-1.height',
          'packages.pkg-1.targetQuantity',
        ]),
      );
    }
  });

  it('rejects margins that leave no usable paper area', () => {
    const result = parseCalculatorInputs(
      { width: '100', height: '80', margin: '50', gap: '2' },
      [
        {
          id: 'pkg-1',
          name: '盒',
          inputMode: 'rectangle',
          width: '20',
          height: '10',
          boxLength: '',
          boxWidth: '',
          boxHeight: '',
          thickness: '',
          targetQuantity: '',
          allowRotate: true,
        },
      ],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.field)).toContain('paper.margin');
    }
  });
});

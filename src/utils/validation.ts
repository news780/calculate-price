import type { PackageInput, PackageInputMode, PaperSettings, ValidationError } from '../types/layout';
import { createStraightTuckDieline } from '../algorithms/dielines';

export interface PaperFormValues {
  width: string;
  height: string;
  margin: string;
  gap: string;
}

export interface PackageFormValues {
  id: string;
  name: string;
  inputMode: PackageInputMode;
  width: string;
  height: string;
  boxLength: string;
  boxWidth: string;
  boxHeight: string;
  thickness: string;
  targetQuantity: string;
  allowRotate: boolean;
}

export type ParseResult =
  | {
      ok: true;
      paper: PaperSettings;
      packages: PackageInput[];
      errors: [];
    }
  | {
      ok: false;
      errors: ValidationError[];
    };

function parseNumber(value: string): number {
  return Number(value);
}

function addPositiveNumberError(
  errors: ValidationError[],
  field: string,
  value: string,
  label: string,
): number {
  const parsed = parseNumber(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push({ field, message: `${label}必须大于 0` });
  }

  return parsed;
}

function addNonNegativeNumberError(
  errors: ValidationError[],
  field: string,
  value: string,
  label: string,
): number {
  const parsed = parseNumber(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push({ field, message: `${label}不能小于 0` });
  }

  return parsed;
}

function parseOptionalPositiveNumber(
  errors: ValidationError[],
  field: string,
  value: string,
  label: string,
  fallback: number,
): number {
  if (value.trim() === '') {
    return fallback;
  }

  return addPositiveNumberError(errors, field, value, label);
}

function parseTargetQuantity(errors: ValidationError[], field: string, value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsed = parseNumber(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push({ field, message: '目标数量必须是正整数' });
  }

  return parsed;
}

function parsePackage(errors: ValidationError[], packageValue: PackageFormValues): PackageInput {
  const fieldPrefix = `packages.${packageValue.id}`;
  const trimmedName = packageValue.name.trim();
  const targetQuantity = parseTargetQuantity(
    errors,
    `${fieldPrefix}.targetQuantity`,
    packageValue.targetQuantity,
  );

  if (!trimmedName) {
    errors.push({ field: `${fieldPrefix}.name`, message: '名称不能为空' });
  }

  if (packageValue.inputMode === 'straightTuck') {
    const boxLength = addPositiveNumberError(errors, `${fieldPrefix}.boxLength`, packageValue.boxLength, '长 L');
    const boxWidth = addPositiveNumberError(errors, `${fieldPrefix}.boxWidth`, packageValue.boxWidth, '宽 W');
    const boxHeight = addPositiveNumberError(errors, `${fieldPrefix}.boxHeight`, packageValue.boxHeight, '高 H');
    const thickness = parseOptionalPositiveNumber(
      errors,
      `${fieldPrefix}.thickness`,
      packageValue.thickness,
      '纸张厚度',
      0.5,
    );
    const dieline = createStraightTuckDieline({ length: boxLength, width: boxWidth, height: boxHeight, thickness });

    return {
      id: packageValue.id,
      name: trimmedName || '未命名包装',
      inputMode: 'straightTuck',
      width: dieline.width,
      height: dieline.height,
      boxLength,
      boxWidth,
      boxHeight,
      thickness,
      targetQuantity,
      allowRotate: packageValue.allowRotate,
    };
  }

  return {
    id: packageValue.id,
    name: trimmedName || '未命名包装',
    inputMode: 'rectangle',
    width: addPositiveNumberError(errors, `${fieldPrefix}.width`, packageValue.width, '展开宽度'),
    height: addPositiveNumberError(errors, `${fieldPrefix}.height`, packageValue.height, '展开高度'),
    targetQuantity,
    allowRotate: packageValue.allowRotate,
  };
}

export function parseCalculatorInputs(
  paperValues: PaperFormValues,
  packageValues: PackageFormValues[],
): ParseResult {
  const errors: ValidationError[] = [];
  const width = addPositiveNumberError(errors, 'paper.width', paperValues.width, '纸张宽度');
  const height = addPositiveNumberError(errors, 'paper.height', paperValues.height, '纸张高度');
  const margin = addNonNegativeNumberError(errors, 'paper.margin', paperValues.margin, '边距');
  const gap = addNonNegativeNumberError(errors, 'paper.gap', paperValues.gap, '包装间距');

  if (Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(margin)) {
    if (width - margin * 2 <= 0 || height - margin * 2 <= 0) {
      errors.push({ field: 'paper.margin', message: '边距过大，纸张可用区域必须大于 0' });
    }
  }

  const packages = packageValues.map((packageValue) => parsePackage(errors, packageValue));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    paper: { width, height, margin, gap },
    packages,
    errors: [],
  };
}

export type LayoutOrientation = 'original' | 'rotated';

export interface PaperSettings {
  width: number;
  height: number;
  margin: number;
  gap: number;
}

export type PackageInputMode = 'rectangle' | 'straightTuck';

export interface PackageInput {
  id: string;
  name: string;
  inputMode: PackageInputMode;
  width: number;
  height: number;
  boxLength?: number;
  boxWidth?: number;
  boxHeight?: number;
  thickness?: number;
  targetQuantity: number | null;
  allowRotate: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface FoldLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'fold' | 'crease';
}

export interface DieLineGeometry {
  kind: PackageInputMode;
  width: number;
  height: number;
  area: number;
  outline: Point[];
  cutPath: string;
  foldLines: FoldLine[];
}

export interface GridPosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapePlacement = GridPosition;

interface BaseLayoutResult {
  packageId: string;
  packageName: string;
  packageWidth: number;
  packageHeight: number;
  placedWidth: number;
  placedHeight: number;
  orientation: LayoutOrientation;
  dieline: DieLineGeometry;
  paper: PaperSettings;
  usableWidth: number;
  usableHeight: number;
  targetQuantity: number | null;
  requiredSheetsForTarget: number | null;
}

export interface NormalLayoutResult extends BaseLayoutResult {
  mode: 'normal';
  cols: number;
  rows: number;
  count: number;
  utilization: number;
  positions: ShapePlacement[];
  layoutMethod: 'grid' | 'shape-scan';
}

export interface OversizedLayoutResult extends BaseLayoutResult {
  mode: 'oversized';
  tilesX: number;
  tilesY: number;
  sheetsPerBox: number;
  notice: string;
}

export type PackageLayoutResult = NormalLayoutResult | OversizedLayoutResult;

export interface ValidationError {
  field: string;
  message: string;
}

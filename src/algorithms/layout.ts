import type {
  DieLineGeometry,
  LayoutOrientation,
  NormalLayoutResult,
  OversizedLayoutResult,
  PackageInput,
  PackageLayoutResult,
  PaperSettings,
  ShapePlacement,
} from '../types/layout';
import { createRectangleDieline, createStraightTuckDieline, rotateDieline } from './dielines';
import { packDielineOnPaper } from './irregularPacking';

const MINIMUM_COUNT = 0;
const FIRST_INDEX = 1;
const RATIO_EPSILON = 0.000001;
const OVERSIZED_NOTICE = '实际生产还需考虑拼接边、出血、压线和结构强度。';

interface CandidateLayout {
  orientation: LayoutOrientation;
  dieline: DieLineGeometry;
  placedWidth: number;
  placedHeight: number;
  cols: number;
  rows: number;
  count: number;
  utilization: number;
  ratioDifference: number;
}

interface OversizedCandidate {
  orientation: LayoutOrientation;
  dieline: DieLineGeometry;
  placedWidth: number;
  placedHeight: number;
  tilesX: number;
  tilesY: number;
  sheetsPerBox: number;
}

function getUsablePaper(paper: PaperSettings) {
  return {
    usableWidth: Math.max(MINIMUM_COUNT, paper.width - paper.margin * 2),
    usableHeight: Math.max(MINIMUM_COUNT, paper.height - paper.margin * 2),
  };
}

function createDieline(packageInput: PackageInput): DieLineGeometry {
  if (packageInput.inputMode === 'straightTuck') {
    return createStraightTuckDieline({
      length: packageInput.boxLength ?? packageInput.width,
      width: packageInput.boxWidth ?? packageInput.height,
      height: packageInput.boxHeight ?? packageInput.height,
      thickness: packageInput.thickness,
    });
  }

  return createRectangleDieline(packageInput.width, packageInput.height);
}

export function calculateUtilization(
  count: number,
  packageWidth: number,
  packageHeight: number,
  usableWidth: number,
  usableHeight: number,
): number {
  const usableArea = usableWidth * usableHeight;

  if (usableArea <= 0 || count <= 0) {
    return 0;
  }

  return (count * packageWidth * packageHeight) / usableArea;
}

function calculateCandidate(
  paper: PaperSettings,
  packageInput: PackageInput,
  orientation: LayoutOrientation,
): CandidateLayout {
  const { usableWidth, usableHeight } = getUsablePaper(paper);
  const baseDieline = createDieline(packageInput);
  const dieline = orientation === 'original' ? baseDieline : rotateDieline(baseDieline);
  const placedWidth = dieline.width;
  const placedHeight = dieline.height;
  const cols =
    placedWidth > 0 && usableWidth > 0
      ? Math.floor((usableWidth + paper.gap) / (placedWidth + paper.gap))
      : MINIMUM_COUNT;
  const rows =
    placedHeight > 0 && usableHeight > 0
      ? Math.floor((usableHeight + paper.gap) / (placedHeight + paper.gap))
      : MINIMUM_COUNT;
  const count = Math.max(MINIMUM_COUNT, cols) * Math.max(MINIMUM_COUNT, rows);
  const paperRatio = usableWidth > 0 && usableHeight > 0 ? usableWidth / usableHeight : 0;
  const pieceRatio = placedHeight > 0 ? placedWidth / placedHeight : 0;

  return {
    orientation,
    dieline,
    placedWidth,
    placedHeight,
    cols: Math.max(MINIMUM_COUNT, cols),
    rows: Math.max(MINIMUM_COUNT, rows),
    count,
    utilization: calculateUtilization(count, dieline.area, 1, usableWidth, usableHeight),
    ratioDifference: Math.abs(paperRatio - pieceRatio),
  };
}

function chooseNormalCandidate(candidates: CandidateLayout[]): CandidateLayout {
  return [...candidates].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    if (Math.abs(right.utilization - left.utilization) > RATIO_EPSILON) {
      return right.utilization - left.utilization;
    }

    return left.ratioDifference - right.ratioDifference;
  })[0];
}

export function generateGridPositions(layout: Omit<NormalLayoutResult, 'positions'>): ShapePlacement[] {
  const positions: ShapePlacement[] = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      positions.push({
        index: positions.length + FIRST_INDEX,
        x: layout.paper.margin + col * (layout.placedWidth + layout.paper.gap),
        y: layout.paper.margin + row * (layout.placedHeight + layout.paper.gap),
        width: layout.placedWidth,
        height: layout.placedHeight,
      });
    }
  }

  return positions;
}

export function calculateSinglePackageLayout(
  paper: PaperSettings,
  packageInput: PackageInput,
): NormalLayoutResult {
  const { usableWidth, usableHeight } = getUsablePaper(paper);
  const candidates = [calculateCandidate(paper, packageInput, 'original')];

  if (packageInput.allowRotate) {
    candidates.push(calculateCandidate(paper, packageInput, 'rotated'));
  }

  const best = chooseNormalCandidate(candidates);
  const resultWithoutPositions: Omit<NormalLayoutResult, 'positions'> = {
    mode: 'normal',
    packageId: packageInput.id,
    packageName: packageInput.name,
    packageWidth: packageInput.width,
    packageHeight: packageInput.height,
    placedWidth: best.placedWidth,
    placedHeight: best.placedHeight,
    orientation: best.orientation,
    dieline: best.dieline,
    paper,
    usableWidth,
    usableHeight,
    targetQuantity: packageInput.targetQuantity,
    requiredSheetsForTarget:
      packageInput.targetQuantity && best.count > 0 ? Math.ceil(packageInput.targetQuantity / best.count) : null,
    cols: best.cols,
    rows: best.rows,
    count: best.count,
    utilization: best.utilization,
    layoutMethod: 'grid',
  };

  return {
    ...resultWithoutPositions,
    positions: generateGridPositions(resultWithoutPositions),
  };
}

function calculateOversizedCandidate(
  paper: PaperSettings,
  packageInput: PackageInput,
  orientation: LayoutOrientation,
): OversizedCandidate {
  const { usableWidth, usableHeight } = getUsablePaper(paper);
  const baseDieline = createDieline(packageInput);
  const dieline = orientation === 'original' ? baseDieline : rotateDieline(baseDieline);
  const placedWidth = dieline.width;
  const placedHeight = dieline.height;
  const tilesX = usableWidth > 0 ? Math.ceil(placedWidth / usableWidth) : MINIMUM_COUNT;
  const tilesY = usableHeight > 0 ? Math.ceil(placedHeight / usableHeight) : MINIMUM_COUNT;

  return {
    orientation,
    dieline,
    placedWidth,
    placedHeight,
    tilesX,
    tilesY,
    sheetsPerBox: tilesX * tilesY,
  };
}

function chooseOversizedCandidate(candidates: OversizedCandidate[]): OversizedCandidate {
  return [...candidates].sort((left, right) => {
    if (left.sheetsPerBox !== right.sheetsPerBox) {
      return left.sheetsPerBox - right.sheetsPerBox;
    }

    if (left.tilesX !== right.tilesX) {
      return left.tilesX - right.tilesX;
    }

    return left.tilesY - right.tilesY;
  })[0];
}

export function calculateOversizedPackageLayout(
  paper: PaperSettings,
  packageInput: PackageInput,
): OversizedLayoutResult {
  const { usableWidth, usableHeight } = getUsablePaper(paper);
  const candidates = [calculateOversizedCandidate(paper, packageInput, 'original')];

  if (packageInput.allowRotate) {
    candidates.push(calculateOversizedCandidate(paper, packageInput, 'rotated'));
  }

  const best = chooseOversizedCandidate(candidates);

  return {
    mode: 'oversized',
    packageId: packageInput.id,
    packageName: packageInput.name,
    packageWidth: packageInput.width,
    packageHeight: packageInput.height,
    placedWidth: best.placedWidth,
    placedHeight: best.placedHeight,
    orientation: best.orientation,
    dieline: best.dieline,
    paper,
    usableWidth,
    usableHeight,
    targetQuantity: packageInput.targetQuantity,
    requiredSheetsForTarget: packageInput.targetQuantity ? packageInput.targetQuantity * best.sheetsPerBox : null,
    tilesX: best.tilesX,
    tilesY: best.tilesY,
    sheetsPerBox: best.sheetsPerBox,
    notice: OVERSIZED_NOTICE,
  };
}

function calculateShapeLayout(paper: PaperSettings, packageInput: PackageInput): PackageLayoutResult {
  const dieline = createDieline(packageInput);
  const { usableWidth, usableHeight } = getUsablePaper(paper);
  const packed = packDielineOnPaper({ paper, dieline, allowRotate: packageInput.allowRotate });

  if (packed.count === 0) {
    return calculateOversizedPackageLayout(paper, packageInput);
  }

  return {
    mode: 'normal',
    packageId: packageInput.id,
    packageName: packageInput.name,
    packageWidth: packageInput.boxLength ?? packageInput.width,
    packageHeight: packageInput.boxHeight ?? packageInput.height,
    placedWidth: packed.dieline.width,
    placedHeight: packed.dieline.height,
    orientation: packed.orientation,
    dieline: packed.dieline,
    paper,
    usableWidth,
    usableHeight,
    targetQuantity: packageInput.targetQuantity,
    requiredSheetsForTarget: packageInput.targetQuantity
      ? Math.ceil(packageInput.targetQuantity / packed.count)
      : null,
    cols: 0,
    rows: 0,
    count: packed.count,
    utilization: calculateUtilization(packed.count, packed.dieline.area, 1, usableWidth, usableHeight),
    positions: packed.placements,
    layoutMethod: 'shape-scan',
  };
}

export function calculateBestLayout(
  paper: PaperSettings,
  packageInput: PackageInput,
): PackageLayoutResult {
  if (packageInput.inputMode === 'straightTuck') {
    return calculateShapeLayout(paper, packageInput);
  }

  const normalLayout = calculateSinglePackageLayout(paper, packageInput);

  if (normalLayout.count > 0) {
    return normalLayout;
  }

  return calculateOversizedPackageLayout(paper, packageInput);
}

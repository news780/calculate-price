import type { FoldLine, PackageLayoutResult } from '../types/layout';

interface LayoutPreview2DProps {
  result: PackageLayoutResult;
}

const MAX_LABEL_COUNT = 80;

function foldLineToSvg(line: FoldLine, offsetX: number, offsetY: number) {
  return {
    x1: offsetX + line.x1,
    y1: offsetY + line.y1,
    x2: offsetX + line.x2,
    y2: offsetY + line.y2,
  };
}

export function LayoutPreview2D({ result }: LayoutPreview2DProps) {
  if (result.mode === 'oversized') {
    const verticalLines = Array.from({ length: result.tilesX + 1 }, (_, index) => index);
    const horizontalLines = Array.from({ length: result.tilesY + 1 }, (_, index) => index);

    return (
      <div className="preview-panel">
        <div className="preview-title">
          <h4>二维分片图</h4>
          <span>{result.sheetsPerBox} 张纸</span>
        </div>
        <svg
          className="layout-svg"
          viewBox={`0 0 ${result.placedWidth} ${result.placedHeight}`}
          role="img"
          aria-label={`${result.packageName} 超大分片示意图`}
        >
          <rect width={result.placedWidth} height={result.placedHeight} className="svg-sheet" />
          <path d={result.dieline.cutPath} className="svg-dieline-cut" />
          {result.dieline.foldLines.map((line, index) => (
            <line key={index} {...foldLineToSvg(line, 0, 0)} className="svg-dieline-fold" />
          ))}
          {verticalLines.map((lineIndex) => (
            <line
              key={`vertical-${lineIndex}`}
              x1={(result.placedWidth / result.tilesX) * lineIndex}
              y1="0"
              x2={(result.placedWidth / result.tilesX) * lineIndex}
              y2={result.placedHeight}
              className="svg-grid-line"
            />
          ))}
          {horizontalLines.map((lineIndex) => (
            <line
              key={`horizontal-${lineIndex}`}
              x1="0"
              y1={(result.placedHeight / result.tilesY) * lineIndex}
              x2={result.placedWidth}
              y2={(result.placedHeight / result.tilesY) * lineIndex}
              className="svg-grid-line"
            />
          ))}
        </svg>
      </div>
    );
  }

  const showLabels = result.count <= MAX_LABEL_COUNT;

  return (
    <div className="preview-panel">
      <div className="preview-title">
        <h4>二维刀模拼版</h4>
        <span>{result.layoutMethod === 'grid' ? `${result.cols} 列 x ${result.rows} 行` : '异形扫描'}</span>
      </div>
      <svg
        className="layout-svg"
        viewBox={`0 0 ${result.paper.width} ${result.paper.height}`}
        role="img"
        aria-label={`${result.packageName} 二维刀模拼版示意图`}
      >
        <rect width={result.paper.width} height={result.paper.height} className="svg-sheet" />
        <rect
          x={result.paper.margin}
          y={result.paper.margin}
          width={result.usableWidth}
          height={result.usableHeight}
          className="svg-usable-area"
        />
        {result.positions.map((position) => (
          <g key={position.index} transform={`translate(${position.x} ${position.y})`}>
            <path d={result.dieline.cutPath} className="svg-dieline-cut" />
            {result.dieline.foldLines.map((line, index) => (
              <line key={index} {...foldLineToSvg(line, 0, 0)} className="svg-dieline-fold" />
            ))}
            {showLabels ? (
              <text
                x={position.width / 2}
                y={position.height / 2}
                className="svg-piece-label"
              >
                {position.index}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

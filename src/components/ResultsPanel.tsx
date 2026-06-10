import { LayoutPreview2D } from './LayoutPreview2D';
import { LayoutPreview3D } from './LayoutPreview3D';
import type { PackageLayoutResult } from '../types/layout';

interface ResultsPanelProps {
  results: PackageLayoutResult[];
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatOrientation(orientation: PackageLayoutResult['orientation']): string {
  return orientation === 'rotated' ? '旋转 90°' : '原方向';
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div className="results-panel">
      <div className="result-heading">
        <div>
          <h2>计算结果</h2>
          <p>矩形展开片走规则行列；盒型模板先生成刀模轮廓，再按轮廓外接范围扫描排版。</p>
        </div>
        <span>{results.length} 组结果</span>
      </div>

      <div className="result-list">
        {results.map((result) => (
          <article className="result-card" key={result.packageId}>
            <div className="result-summary">
              <div>
                <h3>{result.packageName}</h3>
                <p>
                  刀模外接范围 {result.placedWidth.toFixed(2)} x {result.placedHeight.toFixed(2)} mm
                </p>
              </div>
              <span className={result.mode === 'normal' ? 'status-pill success' : 'status-pill warning'}>
                {result.mode === 'normal' ? '可排版' : '超大分片'}
              </span>
            </div>

            {result.mode === 'normal' ? (
              <div className="metric-grid">
                <div>
                  <span>一张纸最多切</span>
                  <strong>{result.count}</strong>
                </div>
                <div>
                  <span>最佳方向</span>
                  <strong>{formatOrientation(result.orientation)}</strong>
                </div>
                <div>
                  <span>排版方法</span>
                  <strong>{result.layoutMethod === 'shape-scan' ? '异形扫描' : '规则行列'}</strong>
                </div>
                <div>
                  <span>行列参考</span>
                  <strong>{result.layoutMethod === 'grid' ? `${result.cols} x ${result.rows}` : '自动扫描'}</strong>
                </div>
                <div>
                  <span>材料利用率</span>
                  <strong>{formatPercent(result.utilization)}</strong>
                </div>
                <div>
                  <span>目标所需纸张</span>
                  <strong>
                    {result.requiredSheetsForTarget ? `${result.requiredSheetsForTarget} 张` : '未填写'}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="oversized-block">
                <div className="metric-grid">
                  <div>
                    <span>一个盒子至少需要</span>
                    <strong>{result.sheetsPerBox} 张</strong>
                  </div>
                  <div>
                    <span>横向分片</span>
                    <strong>{result.tilesX}</strong>
                  </div>
                  <div>
                    <span>纵向分片</span>
                    <strong>{result.tilesY}</strong>
                  </div>
                  <div>
                    <span>建议方向</span>
                    <strong>{formatOrientation(result.orientation)}</strong>
                  </div>
                  <div>
                    <span>目标所需纸张</span>
                    <strong>
                      {result.requiredSheetsForTarget ? `${result.requiredSheetsForTarget} 张` : '未填写'}
                    </strong>
                  </div>
                </div>
                <p className="production-note">{result.notice}</p>
              </div>
            )}

            <div className="preview-grid">
              <LayoutPreview2D result={result} />
              <LayoutPreview3D result={result} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { calculateBestLayout } from './algorithms/layout';
import { PackageList } from './components/PackageList';
import { PaperForm } from './components/PaperForm';
import { ResultsPanel } from './components/ResultsPanel';
import type { PackageLayoutResult, ValidationError } from './types/layout';
import {
  parseCalculatorInputs,
  type PackageFormValues,
  type PaperFormValues,
} from './utils/validation';

const DEFAULT_PAPER: PaperFormValues = {
  width: '787',
  height: '1092',
  margin: '10',
  gap: '3',
};

const DEFAULT_PACKAGE: PackageFormValues = {
  id: 'pkg-1',
  name: '普通双插盒 A',
  inputMode: 'straightTuck',
  width: '180',
  height: '120',
  boxLength: '120',
  boxWidth: '60',
  boxHeight: '160',
  thickness: '0.5',
  targetQuantity: '500',
  allowRotate: true,
};

function createPackageRow(index: number): PackageFormValues {
  return {
    id: `pkg-${Date.now()}-${index}`,
    name: `包装 ${index + 1}`,
    inputMode: 'straightTuck',
    width: '',
    height: '',
    boxLength: '',
    boxWidth: '',
    boxHeight: '',
    thickness: '0.5',
    targetQuantity: '',
    allowRotate: true,
  };
}

function mapErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((mappedErrors, error) => {
    mappedErrors[error.field] = error.message;
    return mappedErrors;
  }, {});
}

export default function App() {
  const [paperValues, setPaperValues] = useState<PaperFormValues>(DEFAULT_PAPER);
  const [packageValues, setPackageValues] = useState<PackageFormValues[]>([DEFAULT_PACKAGE]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<PackageLayoutResult[]>([]);

  const hasResults = results.length > 0;
  const packageCountLabel = useMemo(() => `${packageValues.length} 个包装尺寸`, [packageValues.length]);

  function handleCalculate() {
    const parsed = parseCalculatorInputs(paperValues, packageValues);

    if (!parsed.ok) {
      setErrors(mapErrors(parsed.errors));
      setResults([]);
      return;
    }

    setErrors({});
    setResults(parsed.packages.map((packageInput) => calculateBestLayout(parsed.paper, packageInput)));
  }

  function updatePaperField(field: keyof PaperFormValues, value: string) {
    setPaperValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function updatePackage(packageId: string, nextValues: Partial<PackageFormValues>) {
    setPackageValues((currentValues) =>
      currentValues.map((packageValue) =>
        packageValue.id === packageId ? { ...packageValue, ...nextValues } : packageValue,
      ),
    );
  }

  function addPackage() {
    setPackageValues((currentValues) => [...currentValues, createPackageRow(currentValues.length)]);
  }

  function removePackage(packageId: string) {
    setPackageValues((currentValues) =>
      currentValues.length === 1
        ? currentValues
        : currentValues.filter((packageValue) => packageValue.id !== packageId),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>包装纸张排版计算器</h1>
          <p>支持矩形展开片，也支持输入盒型长宽高生成异形刀模后再拼版。</p>
        </div>
        <button className="primary-button" type="button" onClick={handleCalculate}>
          计算排版
        </button>
      </header>

      <section className="workspace-grid" aria-label="计算器输入">
        <div className="panel">
          <div className="panel-heading">
            <h2>纸张尺寸</h2>
            <span>单位 mm</span>
          </div>
          <PaperForm values={paperValues} errors={errors} onChange={updatePaperField} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>包装尺寸</h2>
            <span>{packageCountLabel}</span>
          </div>
          <PackageList
            packages={packageValues}
            errors={errors}
            onAdd={addPackage}
            onRemove={removePackage}
            onUpdate={updatePackage}
          />
        </div>
      </section>

      <section className="result-section" aria-live="polite">
        {hasResults ? (
          <ResultsPanel results={results} />
        ) : (
          <div className="empty-state">
            <h2>等待计算</h2>
            <p>输入纸张尺寸和包装尺寸后点击“计算排版”，这里会显示刀模拼版、折线和 3D 实时预览。</p>
          </div>
        )}
      </section>
    </main>
  );
}

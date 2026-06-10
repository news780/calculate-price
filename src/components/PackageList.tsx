import { NumberField } from './NumberField';
import type { PackageFormValues } from '../utils/validation';
import type { PackageInputMode } from '../types/layout';

interface PackageListProps {
  packages: PackageFormValues[];
  errors: Record<string, string>;
  onAdd: () => void;
  onRemove: (packageId: string) => void;
  onUpdate: (packageId: string, values: Partial<PackageFormValues>) => void;
}

const INPUT_MODE_OPTIONS: Array<{ value: PackageInputMode; label: string }> = [
  { value: 'straightTuck', label: '普通双插盒(异侧)' },
  { value: 'rectangle', label: '矩形展开片' },
];

export function PackageList({ packages, errors, onAdd, onRemove, onUpdate }: PackageListProps) {
  return (
    <div className="package-list">
      {packages.map((packageValue, index) => {
        const prefix = `packages.${packageValue.id}`;
        const isBoxTemplate = packageValue.inputMode === 'straightTuck';

        return (
          <div className="package-row" key={packageValue.id}>
            <div className="package-row-header">
              <label className="field text-field" htmlFor={`${packageValue.id}-name`}>
                <span className="field-label">名称</span>
                <input
                  id={`${packageValue.id}-name`}
                  type="text"
                  value={packageValue.name}
                  aria-invalid={Boolean(errors[`${prefix}.name`])}
                  onChange={(event) => onUpdate(packageValue.id, { name: event.target.value })}
                />
                {errors[`${prefix}.name`] ? (
                  <span className="field-error">{errors[`${prefix}.name`]}</span>
                ) : null}
              </label>

              <button
                className="ghost-button danger-button"
                type="button"
                disabled={packages.length === 1}
                onClick={() => onRemove(packageValue.id)}
              >
                删除
              </button>
            </div>

            <label className="field select-field" htmlFor={`${packageValue.id}-mode`}>
              <span className="field-label">输入方式</span>
              <select
                id={`${packageValue.id}-mode`}
                value={packageValue.inputMode}
                onChange={(event) =>
                  onUpdate(packageValue.id, { inputMode: event.target.value as PackageInputMode })
                }
              >
                {INPUT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="package-fields">
              {isBoxTemplate ? (
                <>
                  <NumberField
                    id={`${packageValue.id}-box-length`}
                    label="长 L"
                    value={packageValue.boxLength}
                    min={0.01}
                    error={errors[`${prefix}.boxLength`]}
                    onChange={(value) => onUpdate(packageValue.id, { boxLength: value })}
                  />
                  <NumberField
                    id={`${packageValue.id}-box-width`}
                    label="宽 W"
                    value={packageValue.boxWidth}
                    min={0.01}
                    error={errors[`${prefix}.boxWidth`]}
                    onChange={(value) => onUpdate(packageValue.id, { boxWidth: value })}
                  />
                  <NumberField
                    id={`${packageValue.id}-box-height`}
                    label="高 H"
                    value={packageValue.boxHeight}
                    min={0.01}
                    error={errors[`${prefix}.boxHeight`]}
                    onChange={(value) => onUpdate(packageValue.id, { boxHeight: value })}
                  />
                  <NumberField
                    id={`${packageValue.id}-thickness`}
                    label="纸张厚度"
                    value={packageValue.thickness}
                    min={0.01}
                    optional
                    error={errors[`${prefix}.thickness`]}
                    onChange={(value) => onUpdate(packageValue.id, { thickness: value })}
                  />
                </>
              ) : (
                <>
                  <NumberField
                    id={`${packageValue.id}-width`}
                    label="展开宽度"
                    value={packageValue.width}
                    min={0.01}
                    error={errors[`${prefix}.width`]}
                    onChange={(value) => onUpdate(packageValue.id, { width: value })}
                  />
                  <NumberField
                    id={`${packageValue.id}-height`}
                    label="展开高度"
                    value={packageValue.height}
                    min={0.01}
                    error={errors[`${prefix}.height`]}
                    onChange={(value) => onUpdate(packageValue.id, { height: value })}
                  />
                </>
              )}
              <NumberField
                id={`${packageValue.id}-target`}
                label="目标数量"
                value={packageValue.targetQuantity}
                min={1}
                optional
                unit="个"
                placeholder="不填"
                error={errors[`${prefix}.targetQuantity`]}
                onChange={(value) => onUpdate(packageValue.id, { targetQuantity: value })}
              />
              <label className="checkbox-field" htmlFor={`${packageValue.id}-rotate`}>
                <input
                  id={`${packageValue.id}-rotate`}
                  type="checkbox"
                  checked={packageValue.allowRotate}
                  onChange={(event) => onUpdate(packageValue.id, { allowRotate: event.target.checked })}
                />
                <span>允许旋转</span>
              </label>
            </div>

            <span className="row-index">#{index + 1}</span>
          </div>
        );
      })}

      <button className="secondary-button" type="button" onClick={onAdd}>
        新增包装尺寸
      </button>
    </div>
  );
}

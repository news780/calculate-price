import { NumberField } from './NumberField';
import type { PaperFormValues } from '../utils/validation';

interface PaperFormProps {
  values: PaperFormValues;
  errors: Record<string, string>;
  onChange: (field: keyof PaperFormValues, value: string) => void;
}

export function PaperForm({ values, errors, onChange }: PaperFormProps) {
  return (
    <div className="form-grid">
      <NumberField
        id="paper-width"
        label="纸张宽度"
        value={values.width}
        min={0.01}
        error={errors['paper.width']}
        onChange={(value) => onChange('width', value)}
      />
      <NumberField
        id="paper-height"
        label="纸张高度"
        value={values.height}
        min={0.01}
        error={errors['paper.height']}
        onChange={(value) => onChange('height', value)}
      />
      <NumberField
        id="paper-margin"
        label="纸张边距"
        value={values.margin}
        error={errors['paper.margin']}
        onChange={(value) => onChange('margin', value)}
      />
      <NumberField
        id="paper-gap"
        label="包装间距"
        value={values.gap}
        error={errors['paper.gap']}
        onChange={(value) => onChange('gap', value)}
      />
    </div>
  );
}

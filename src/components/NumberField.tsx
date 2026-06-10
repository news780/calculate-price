interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  min?: number;
  placeholder?: string;
  optional?: boolean;
  unit?: string;
  onChange: (value: string) => void;
}

export function NumberField({
  id,
  label,
  value,
  error,
  min = 0,
  placeholder,
  optional = false,
  unit = 'mm',
  onChange,
}: NumberFieldProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {label}
        {optional ? <small>可选</small> : null}
      </span>
      <div className="input-with-unit">
        <input
          id={id}
          type="number"
          min={min}
          step="any"
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

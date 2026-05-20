interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  placeholder?: string;
  readOnly?: boolean;
  labelStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  unitStyle?: React.CSSProperties;
}

export const InputField = ({
  label,
  value,
  onChange,
  unit = '',
  placeholder = '',
  readOnly = false,
  labelStyle,
  inputStyle,
  unitStyle
}: InputFieldProps) => {
  const regularLufgaStyle = { fontFamily: "'Lufga', sans-serif", fontWeight: 400 } as const;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700" style={labelStyle ?? regularLufgaStyle}>
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full px-3 py-1.5 border rounded-md focus:ring-1 focus:border-transparent text-sm
            ${readOnly
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          style={inputStyle ?? regularLufgaStyle}
        />
        {unit && (
          <span className="absolute right-3 top-1.5 text-sm text-gray-500" style={unitStyle ?? regularLufgaStyle}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

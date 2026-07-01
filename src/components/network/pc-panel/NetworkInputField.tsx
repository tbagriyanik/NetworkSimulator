import { FormInput } from '@/components/ui/FormInput';

interface NetworkInputFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  error?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function NetworkInputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  onBlur,
  onKeyDown,
}: NetworkInputFieldProps) {
  return (
    <div className="flex-1">
      <FormInput
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        showValidation
        isValid={!error && value.length > 0}
        className="h-9"
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

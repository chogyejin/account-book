import FormInput from "./FormInput";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  wrapperClassName?: string;
}

export default function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const rawValue = String(value ?? "");
  const displayValue = rawValue ? Number(rawValue).toLocaleString("ko-KR") : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange?.({ ...e, target: { ...e.target, value: raw } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <FormInput
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
    />
  );
}

import clsx from 'clsx';
import styles from './Form.module.css';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  wrapperClassName?: string;
}

export default function FormInput({ label, wrapperClassName, className, ...props }: FormInputProps) {
  return (
    <div className={clsx(styles.formGroup, wrapperClassName)}>
      {label && <label className={styles.formLabel}>{label}</label>}
      <input className={clsx(styles.formInput, className)} {...props} />
    </div>
  );
}

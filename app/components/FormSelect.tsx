import clsx from 'clsx';
import styles from './Form.module.css';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  wrapperClassName?: string;
  children: React.ReactNode;
}

export default function FormSelect({ label, wrapperClassName, className, children, ...props }: FormSelectProps) {
  return (
    <div className={clsx(styles.formGroup, wrapperClassName)}>
      {label && <label className={styles.formLabel}>{label}</label>}
      <select className={clsx(styles.formSelect, className)} {...props}>
        {children}
      </select>
    </div>
  );
}

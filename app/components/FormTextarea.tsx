import clsx from 'clsx';
import styles from './Form.module.css';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  wrapperClassName?: string;
}

export default function FormTextarea({ label, wrapperClassName, className, ...props }: FormTextareaProps) {
  return (
    <div className={clsx(styles.formGroup, wrapperClassName)}>
      {label && <label className={styles.formLabel}>{label}</label>}
      <textarea className={clsx(styles.formTextarea, className)} {...props} />
    </div>
  );
}

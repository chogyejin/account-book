import clsx from 'clsx';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: string;
  icon?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={clsx(styles.card, className)}>{children}</div>;
}

export function CardHeader({ title, icon, children, className }: CardHeaderProps) {
  return (
    <div className={clsx(styles.cardHeader, className)}>
      <h2 className={styles.cardTitle}>
        {icon && <span className={styles.cardIcon}>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return <div className={className}>{children}</div>;
}

import clsx from "clsx";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary";
  size?: "default" | "sm";
  block?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = "default",
  size = "default",
  block = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        size === "sm" && styles.btnSm,
        block && styles.btnBlock,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

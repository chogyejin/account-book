"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import styles from "./Nav.module.css";

const NAV_LINKS = [
  { href: "/", label: "Quick Entry" },
  { href: "/spending", label: "Spending" },
  { href: "/income", label: "Income" },
  { href: "/savings", label: "Savings" },
  { href: "/investments", label: "Invest" },
  { href: "/summary", label: "Summary" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className={styles.navRibbon}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.navLogo}>
          💰 My Money Insights
        </Link>
        <ul className={styles.navLinks}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={clsx(
                  styles.navLink,
                  pathname === link.href && styles.active,
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

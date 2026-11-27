"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import styles from "./styles.module.scss";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

interface SidebarProps {
  links: NavItem[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ links, open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open ? (
        <button
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <aside
        className={`${styles.sidebar} ${open ? styles.show : ""}`}
        aria-label="Navegação principal"
      >
        <p className={styles.navLabel}>Menu principal</p>
        <nav className={styles.nav}>
          {links.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? `${styles.navLink} ${styles.active}` : styles.navLink}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

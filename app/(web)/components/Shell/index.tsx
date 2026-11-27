"use client";

import { useState } from "react";
import { Header } from "./Header";
import { type NavItem, Sidebar } from "./Sidebar";
import styles from "./styles.module.scss";

export interface ShellProps {
  userName: string;
  roleLabel: string;
  links: readonly NavItem[];
  children: React.ReactNode;
}

/** Estrutura comum da área institucional: cabeçalho, navegação e conteúdo. */
export function Shell({ userName, roleLabel, links, children }: ShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Header
        userName={userName}
        roleLabel={roleLabel}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((open) => !open)}
      />
      <div className={styles.body}>
        <Sidebar links={[...links]} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>{children}</main>
      </div>
      <footer className={styles.footer}>Sistema Acadêmico · Ambiente institucional</footer>
    </div>
  );
}

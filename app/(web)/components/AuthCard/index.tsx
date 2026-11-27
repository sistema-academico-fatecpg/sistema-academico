import type { ReactNode } from "react";
import styles from "./styles.module.scss";

/** Cartão compartilhado pelas telas de autenticação que não usam o login dividido. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}

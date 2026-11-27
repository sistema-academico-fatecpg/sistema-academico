import type { Metadata } from "next";
import styles from "@/web/styles/root.module.scss";

export const metadata: Metadata = {
  title: "Sistema Acadêmico",
  description: "Sistema acadêmico institucional com segurança desde a concepção.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={styles.body}>{children}</body>
    </html>
  );
}

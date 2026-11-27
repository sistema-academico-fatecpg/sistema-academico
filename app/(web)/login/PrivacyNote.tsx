import Link from "next/link";
import styles from "./form.module.scss";

/** 11.1.5: aviso de privacidade e contato do DPO na tela de login. */
export function PrivacyNote({ email }: { email: string }) {
  return (
    <p className={styles.privacyNote}>
      Ao entrar, você declara ciência do <Link href="/privacidade">Aviso de Privacidade</Link>.
      Encarregado de Dados: <a href={`mailto:${email}`}>{email}</a>.
    </p>
  );
}

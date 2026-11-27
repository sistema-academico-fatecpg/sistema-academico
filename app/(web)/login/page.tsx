import { Icon } from "@/components";
import { LoginForm } from "./LoginForm";
import styles from "./styles.module.scss";

export default function LoginPage() {
  const dpoEmail = process.env.DPO_EMAIL?.trim() || "dpo@academico.com";
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span>
            <Icon name="academic" size="lg" />
          </span>
          <div>
            <strong>Sistema Acadêmico</strong>
            <small>Portal de gestão acadêmica</small>
          </div>
        </div>
        <div className={styles.intro}>
          <h1>Bem-vindo de volta</h1>
          <p>Acesse sua conta para continuar.</p>
        </div>
        <LoginForm dpoEmail={dpoEmail} />
      </section>
      <aside className={styles.visual}>
        <div className={styles.visualContent}>
          <span className={styles.kicker}>EDUCAÇÃO • GESTÃO • TRANSPARÊNCIA</span>
          <h2>Uma experiência acadêmica mais simples e organizada.</h2>
          <p>Informações, acompanhamento e gestão em um único lugar.</p>
          <div className={styles.visualIcon}>
            <Icon name="academic" size="lg" />
          </div>
        </div>
        <small>© Sistema Acadêmico</small>
      </aside>
    </main>
  );
}

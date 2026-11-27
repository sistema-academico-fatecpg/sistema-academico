import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import styles from "./styles.module.scss";

/**
 * Substitui as três páginas idênticas de "integração de interface"
 * (cursos, disciplinas, períodos), que só mudavam título, descrição e endpoint.
 */
export function ModulePlaceholder({
  title,
  description,
  endpoint,
  roles,
}: {
  title: string;
  description: string;
  endpoint: string;
  roles: string;
}) {
  return (
    <section className={styles.section}>
      <PageHeader title={title} description={description} />
      <Panel>
        <div className={styles.heading}>
          <div>
            <h2 className={styles.subtitle}>Serviço do módulo</h2>
            <p className={styles.description}>
              A interface utiliza os serviços existentes do projeto; as regras de autorização devem
              ser aplicadas novamente no servidor.
            </p>
          </div>
          <Badge>Integração de interface</Badge>
        </div>
        <div className={styles.endpointBox}>
          <p className={styles.caption}>Endpoint existente</p>
          <code className={styles.endpoint}>{endpoint}</code>
        </div>
        <p className={styles.note}>
          Perfis previstos: {roles}. A autorização efetiva depende das permissões concedidas no
          servidor, não apenas da visibilidade desta tela.
        </p>
      </Panel>
    </section>
  );
}

import { Icon, Panel } from "@/components";
import { AcknowledgeButton } from "./AcknowledgeButton";
import styles from "./styles.module.scss";

export function AlertList({
  items,
  canAcknowledge,
}: {
  items: readonly unknown[];
  canAcknowledge: boolean;
}) {
  return (
    <Panel padding="p-5">
      <h2 className={styles.alertTitle}>Alertas pendentes</h2>
      <ul className={styles.alertList}>
        {items.map((alert) => {
          const item = alert as Record<string, unknown>;
          return (
            <li className={styles.alertItem} key={String(item.id)}>
              <span>
                <span className={styles.alertType}>
                  <Icon name="alert" size="sm" /> {String(item.type)}
                </span>{" "}
                — {String(item.message)}
              </span>
              {canAcknowledge ? <AcknowledgeButton id={String(item.id)} /> : null}
            </li>
          );
        })}
        {items.length === 0 ? <li className={styles.alertEmpty}>Nenhum alerta pendente.</li> : null}
      </ul>
    </Panel>
  );
}

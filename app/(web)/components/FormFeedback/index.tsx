import type { ReactNode } from "react";
import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

/** Mensagens de erro/sucesso padronizadas. */
export function FormFeedback({
  error,
  errors,
  message,
}: {
  error?: ReactNode;
  errors?: readonly string[] | null;
  message?: ReactNode;
}) {
  return (
    <>
      {errors && errors.length > 0 ? (
        <ul className={cn(styles.feedback, styles.errors)}>
          {errors.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className={cn(styles.feedback, styles.error)}>{error}</p> : null}
      {message ? <p className={cn(styles.feedback, styles.success)}>{message}</p> : null}
    </>
  );
}

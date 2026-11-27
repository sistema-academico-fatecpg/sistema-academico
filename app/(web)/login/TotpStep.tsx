"use client";

import { Button, Field } from "@/components";
import styles from "./form.module.scss";

export function TotpStep({
  code,
  useRecoveryCode,
  onCode,
  onToggleMode,
}: {
  code: string;
  useRecoveryCode: boolean;
  onCode: (value: string) => void;
  onToggleMode: () => void;
}) {
  return (
    <>
      <Field
        className={styles.codeField}
        inputMode={useRecoveryCode ? "text" : "numeric"}
        label={useRecoveryCode ? "Código de recuperação" : "Código do autenticador"}
        maxLength={useRecoveryCode ? 20 : 6}
        onChange={(event) =>
          onCode(useRecoveryCode ? event.target.value : event.target.value.replace(/\D/g, ""))
        }
        required
        value={code}
      />
      <Button
        className={styles.toggleMode}
        iconName="security"
        iconSize="sm"
        onClick={onToggleMode}
        type="button"
        variant="tertiary"
      >
        {useRecoveryCode
          ? "Usar o aplicativo autenticador"
          : "Perdi o celular: usar código de recuperação"}
      </Button>
    </>
  );
}

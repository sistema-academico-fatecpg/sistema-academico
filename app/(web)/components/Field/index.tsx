"use client";

import { type ReactNode, useId } from "react";
import { cn } from "@/web/lib/utils";
import { Button } from "../Button";
import type { IconName, IconProps } from "../Icon";
import { Input, type InputProps } from "../Input";
import styles from "./styles.module.scss";

export interface FieldAction {
  iconName: IconName | string;
  iconSize?: IconProps["size"];
  label: string;
  onClick: () => void;
}

export interface FieldProps extends Omit<InputProps, "className" | "error"> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Botão de ação à direita do campo, por exemplo para mostrar/ocultar a senha. */
  action?: FieldAction;
  className?: string;
}

/** Rótulo + input + ação opcional, com associação automática por id. */
export function Field({ label, hint, error, action, id, className, ...inputProps }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control}>
        <Input
          id={inputId}
          className={action ? styles.inputWithAction : undefined}
          error={Boolean(error)}
          aria-invalid={error ? true : undefined}
          {...inputProps}
        />
        {action ? (
          <Button
            className={styles.action}
            type="button"
            variant="tertiary"
            size="sm"
            iconName={action.iconName}
            iconSize={action.iconSize}
            aria-label={action.label}
            onClick={action.onClick}
          />
        ) : null}
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

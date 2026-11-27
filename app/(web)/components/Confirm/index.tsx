"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import styles from "./styles.module.scss";

export interface ConfirmProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo base para confirmações e alertas. */
export function Confirm({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    function handlePointerDown(event: PointerEvent) {
      if (event.target === overlayRef.current) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" ref={overlayRef}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <button className={styles.close} aria-label="Fechar" onClick={onCancel} type="button">
          <Icon name="close" />
        </button>
        <div className={styles.symbol}>
          <Icon name={tone === "danger" ? "delete" : "help"} size="lg" />
        </div>
        <h2 id={titleId}>{title}</h2>
        {description ? <p>{description}</p> : null}
        <div className={styles.actions}>
          <Button variant="tertiary" onClick={onCancel} type="button">
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} type="button">
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

"use client";

import { PermissionPicker } from "./PermissionPicker";
import styles from "./styles.module.scss";
import type { RoleItem } from "./types";

export function RoleCard({
  role,
  onSubmit,
}: {
  role: RoleItem;
  onSubmit: (role: RoleItem) => void;
}) {
  return (
    <details className={styles.roleCard}>
      <summary className={styles.summary}>
        {role.name} — {role.permissions.length} permissão(ões)
      </summary>
      <p className={styles.description}>{role.description}</p>
      <ul className={styles.permissionList}>
        {role.permissions.map((permission) => (
          <li className={styles.permissionItem} key={permission}>
            {permission}
          </li>
        ))}
      </ul>
      <details className={styles.subDetails}>
        <summary className={styles.subSummary}>
          Selecionar permissões para solicitar alteração
        </summary>
        <PermissionPicker role={role} onSubmit={onSubmit} />
      </details>
    </details>
  );
}

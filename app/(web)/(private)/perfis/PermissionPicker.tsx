"use client";

import { useState } from "react";
import { Button } from "@/components";
import { ALL_PERMISSIONS } from "./permissions";
import styles from "./styles.module.scss";
import type { RoleItem } from "./types";

export function PermissionPicker({
  role,
  onSubmit,
}: {
  role: RoleItem;
  onSubmit: (role: RoleItem) => void;
}) {
  const [selected, setSelected] = useState<string[]>(role.permissions);
  return (
    <div className={styles.picker}>
      <div className={styles.permissionGrid}>
        {ALL_PERMISSIONS.map((permission) => (
          <label className={styles.permissionOption} key={permission}>
            <input
              checked={selected.includes(permission)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, permission]
                    : current.filter((item) => item !== permission),
                )
              }
              type="checkbox"
            />
            {permission}
          </label>
        ))}
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onSubmit({ ...role, permissions: selected })}
        type="button"
      >
        Solicitar dupla aprovação
      </Button>
    </div>
  );
}

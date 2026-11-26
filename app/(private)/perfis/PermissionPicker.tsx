"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ALL_PERMISSIONS } from "./permissions";
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
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-1 text-xs md:grid-cols-4">
        {ALL_PERMISSIONS.map((permission) => (
          <label className="flex items-center gap-1" key={permission}>
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
        variant="outline"
        onClick={() => onSubmit({ ...role, permissions: selected })}
        type="button"
      >
        Solicitar dupla aprovação
      </Button>
    </div>
  );
}

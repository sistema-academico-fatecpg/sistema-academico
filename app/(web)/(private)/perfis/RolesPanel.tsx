"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormFeedback, Input, Panel } from "@/components";
import { RoleCard } from "./RoleCard";
import styles from "./styles.module.scss";
import type { RoleItem } from "./types";

export function RolesPanel({ roles }: { roles: RoleItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível criar o perfil");
      return;
    }
    setMessage("Perfil criado sem permissões (7.2).");
    setName("");
    router.refresh();
  }

  async function requestPermissions(role: RoleItem) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/roles/${role.id}/permissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        permissionNames: role.permissions,
        reason: `Revisão periódica das permissões do perfil ${role.name}`,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Não foi possível solicitar a alteração");
      return;
    }
    setMessage(`Solicitação ${data.requestId} enviada para dupla aprovação.`);
    router.refresh();
  }

  return (
    <div className={styles.panelStack}>
      <Panel as="form" padding="p-5" className={styles.createForm} onSubmit={createRole}>
        <Input
          className={styles.roleInput}
          onChange={(event) => setName(event.target.value.toUpperCase())}
          placeholder="NOVO_PERFIL (sem permissões)"
          required
          value={name}
        />
        <Button type="submit">Criar perfil vazio</Button>
      </Panel>
      <FormFeedback error={error} message={message} />
      <div className={styles.roles}>
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} onSubmit={requestPermissions} />
        ))}
      </div>
    </div>
  );
}

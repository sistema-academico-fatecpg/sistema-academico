"use client";

import { useState } from "react";
import type { RoleName } from "@/app/types/common";
import { Button, FormFeedback, Input, Label } from "@/components/ui";

const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN_MASTER: "Admin Master",
  ADMIN_SECUNDARIO: "Admin Secundário",
  PROFESSOR: "Professor",
  ALUNO: "Aluno",
  AUDITOR: "Auditor",
  SUPORTE_TECNICO: "Suporte Técnico",
};

const SELECT_CLASS = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

export function CreateUserForm({ creatableRoles }: { creatableRoles: RoleName[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<RoleName>(creatableRoles[0] ?? "ALUNO");
  const adminRole = role === "ADMIN_MASTER" || role === "ADMIN_SECUNDARIO";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setErrors(null);
    setMessage(null);

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        registrationNumber: form.get("registrationNumber") || null,
        role: form.get("role"),
        requestReason: form.get("requestReason"),
        authorizationDocument: form.get("authorizationDocument") || undefined,
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setErrors(
        Array.isArray(data.details)
          ? data.details.map((item: { message: string }) => item.message)
          : [data.error],
      );
      return;
    }

    setMessage(
      data.status === "PENDING_APPROVAL"
        ? "Cadastro enviado para dupla aprovação do Admin Master."
        : "Usuário cadastrado. O link de ativação foi enviado ao titular; nenhuma senha foi definida por você.",
    );
    event.currentTarget.reset();
  }

  return (
    <form className="max-w-xl space-y-4" onSubmit={onSubmit}>
      <p className="text-sm text-slate-600">
        O cadastro não possui campo de senha: a credencial pertence somente ao titular, que a define
        pelo link de ativação de uso único (24h).
      </p>
      <Label>
        Nome completo
        <Input name="name" required />
      </Label>
      <Label>
        E-mail institucional
        <Input name="email" required type="email" />
      </Label>
      <Label>
        Matrícula (opcional)
        <Input name="registrationNumber" />
      </Label>
      <Label>
        Perfil
        <select
          className={SELECT_CLASS}
          name="role"
          onChange={(event) => setRole(event.target.value as RoleName)}
          required
          value={role}
        >
          {creatableRoles.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </select>
      </Label>
      <Label>
        Justificativa {adminRole ? "(obrigatória para perfil administrativo)" : "(opcional)"}
        <textarea
          className={`${SELECT_CLASS} min-h-24`}
          minLength={adminRole ? 10 : undefined}
          name="requestReason"
          required={adminRole}
        />
      </Label>
      {adminRole ? (
        <Label>
          Documento de autorização da direção (8.8.4)
          <Input name="authorizationDocument" placeholder="Ofício nº ..." />
        </Label>
      ) : null}
      <FormFeedback errors={errors} message={message} />
      <Button disabled={loading} type="submit">
        {loading ? "Cadastrando..." : "Cadastrar e enviar ativação"}
      </Button>
    </form>
  );
}

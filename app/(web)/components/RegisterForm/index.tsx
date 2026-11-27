"use client";

import { useState } from "react";
import type { RoleName } from "@/app/types/common";
import { Button } from "@/components/Button";
import { FormFeedback } from "@/components/FormFeedback";
import { Input } from "@/components/Input";
import { ROLE_LABELS } from "@/web/lib/labels";
import styles from "./styles.module.scss";

/** Perfis que solicitam o preenchimento de turma no cadastro. */
const TURMA_ROLES: RoleName[] = ["ALUNO", "PROFESSOR"];

/** Perfis que exigem justificativa e documento de autorização (8.8.4). */
const AUTHORIZATION_ROLES: RoleName[] = ["ADMIN_MASTER", "ADMIN_SECUNDARIO", "AUDITOR"];

/** Perfis que exigem documento formal da direção. */
const DIRETORIA_ROLES: RoleName[] = ["ADMIN_MASTER", "ADMIN_SECUNDARIO"];

export interface RegisterFormProps {
  /** Perfis que o usuário logado tem permissão para criar (um único cargo por inscrição). */
  creatableRoles: RoleName[];
  /** Turmas já cadastradas, carregadas no servidor. */
  classGroups: Array<{ id: string; label: string }>;
}

export function RegisterForm({ classGroups, creatableRoles }: RegisterFormProps) {
  const [role, setRole] = useState<RoleName>(creatableRoles[0] ?? "ALUNO");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);

  const needsTurma = TURMA_ROLES.includes(role);
  const turmaUnavailable = needsTurma && classGroups.length === 0;
  const needsAuthorization = AUTHORIZATION_ROLES.includes(role);
  const needsDiretoriaDocument = DIRETORIA_ROLES.includes(role);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") ?? "").trim();
    const personalEmail = String(formData.get("personalEmail") ?? "").trim();
    const requestReason = String(formData.get("requestReason") ?? "").trim();
    const authorizationDocument = String(formData.get("authorizationDocument") ?? "").trim();
    const classGroupId = String(formData.get("classGroupId") ?? "").trim();

    setErrors(null);
    setMessage(null);
    setRegistrationNumber(null);

    const fieldErrors: string[] = [];
    if (!name) fieldErrors.push("Informe o nome completo.");
    if (!personalEmail) fieldErrors.push("Informe o e-mail.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
      fieldErrors.push("E-mail inválido.");
    }
    if (turmaUnavailable) {
      fieldErrors.push("Cadastre uma turma antes de incluir alunos ou professores.");
    } else if (needsTurma && !classGroupId) {
      fieldErrors.push("Informe a turma.");
    }
    if (needsAuthorization && requestReason.length < 10) {
      fieldErrors.push("Justificativa obrigatória (mínimo de 10 caracteres).");
    }
    if (fieldErrors.length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          personalEmail,
          role,
          ...(needsAuthorization ? { requestReason } : {}),
          ...(needsTurma && classGroupId ? { classGroupId } : {}),
          ...(needsDiretoriaDocument ? { authorizationDocument } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const details = Array.isArray(data.details)
          ? data.details.map((item: { message?: string }) => item.message).filter(Boolean)
          : [];
        setErrors(details.length > 0 ? details : [data.error ?? "Não foi possível cadastrar."]);
        return;
      }

      setRegistrationNumber(data.user?.registrationNumber ?? null);
      setMessage(
        data.status === "PENDING_APPROVAL"
          ? "Cadastro enviado para dupla aprovação do Admin Master. O e-mail institucional será gerado na aprovação."
          : `Usuário cadastrado com sucesso. E-mail institucional: ${data.user?.email ?? "—"}. O link de ativação foi enviado ao e-mail pessoal.`,
      );
      form.reset();
      setRole(creatableRoles[0] ?? "ALUNO");
    } catch {
      setErrors(["Não foi possível completar o cadastro. Tente novamente."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p className={styles.intro}>
        O cadastro não possui campo de senha: a credencial pertence somente ao titular, que a define
        pelo link de ativação de uso único (24h). A matrícula é gerada automaticamente.
      </p>
      <FormFeedback errors={errors} message={message} />
      {registrationNumber ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="registrationNumber">
            Matrícula gerada
          </label>
          <input
            id="registrationNumber"
            type="text"
            value={registrationNumber}
            readOnly
            className={styles.inputReadOnly}
          />
        </div>
      ) : null}
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Nome completo
          </label>
          <Input id="name" name="name" type="text" required />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="personalEmail">
            E-mail pessoal
          </label>
          <Input id="personalEmail" name="personalEmail" type="email" required />
          <p className={styles.hint}>
            É para cá que o titular recebe o link de ativação; o e-mail institucional é gerado pelo
            sistema.
          </p>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label} htmlFor="role">
            Cargo
          </label>
          <select
            id="role"
            name="role"
            className={styles.select}
            required
            value={role}
            onChange={(event) => setRole(event.target.value as RoleName)}
          >
            {creatableRoles.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {needsTurma ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="classGroupId">
            Turma
          </label>
          <select
            id="classGroupId"
            name="classGroupId"
            className={styles.select}
            defaultValue=""
            disabled={turmaUnavailable}
            required
          >
            <option value="" disabled>
              {turmaUnavailable ? "Nenhuma turma cadastrada" : "Selecione a turma"}
            </option>
            {classGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
          <p className={styles.hint}>
            A turma define as notas que o aluno consulta e que o professor lança.
          </p>
        </div>
      ) : null}
      {needsAuthorization ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="requestReason">
            Justificativa
          </label>
          <textarea
            id="requestReason"
            name="requestReason"
            className={styles.textarea}
            minLength={10}
            required
            placeholder="Motivo da criação deste perfil…"
          />
          <p className={styles.hint}>Obrigatória para perfis administrativos e auditor.</p>
        </div>
      ) : null}
      {needsDiretoriaDocument ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="authorizationDocument">
            Documento de autorização da direção (8.8.4)
          </label>
          <Input
            id="authorizationDocument"
            name="authorizationDocument"
            placeholder="Ofício nº …"
          />
        </div>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={loading || turmaUnavailable}>
          {loading ? "Cadastrando…" : "Cadastrar usuário"}
        </Button>
      </div>
    </form>
  );
}

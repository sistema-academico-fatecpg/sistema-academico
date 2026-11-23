"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function RegisterForm({ onSuccess, onError }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [socialName, setSocialName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [role, setRole] = useState("ALUNO");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const roles = [
    { value: "ALUNO", label: "Aluno" },
    { value: "PROFESSOR", label: "Professor" },
    { value: "ADMIN_SECUNDARIO", label: "Admin Secundário" },
    { value: "ADMIN_MASTER", label: "Admin Master" },
    { value: "AUDITOR", label: "Auditor" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          socialName: socialName || undefined,
          email,
          institutionalEmail,
          registrationNumber: registrationNumber || undefined,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Erro ao cadastrar usuário");
        onError?.(data.error?.message || "Erro ao cadastrar usuário");
        return;
      }

      onSuccess?.();
      router.push("/login?registered=true");
    } catch (_err) {
      setError("Erro ao conectar com o servidor");
      onError?.("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Label htmlFor="name">Nome Completo</Label>
      <Input
        id="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={Boolean(error)}
      />

      <Label htmlFor="socialName">Nome Social (opcional)</Label>
      <Input id="socialName" value={socialName} onChange={(e) => setSocialName(e.target.value)} />

      <Label htmlFor="email">Email Pessoal</Label>
      <Input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={Boolean(error)}
      />

      <Label htmlFor="institutionalEmail">Email Institucional</Label>
      <Input
        id="institutionalEmail"
        type="email"
        required
        value={institutionalEmail}
        onChange={(e) => setInstitutionalEmail(e.target.value)}
        error={Boolean(error)}
      />

      <Label htmlFor="registrationNumber">Matrícula (opcional)</Label>
      <Input
        id="registrationNumber"
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value)}
      />

      <Label htmlFor="role">Perfil</Label>
      <select
        id="role"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={role}
        onChange={(e) => setRole(e.target.value as any)}
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" isLoading={loading} className="w-full">
        Cadastrar
      </Button>
    </form>
  );
}

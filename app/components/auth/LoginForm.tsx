"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface LoginFormProps {
  onSuccess?: (token: string) => void;
  onError?: (message: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || "Credenciais inválidas");
        onError?.(data.error?.message || "Credenciais inválidas");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        onSuccess?.(data.token);
        router.push("/dashboard");
      } else {
        setError("Resposta inválida do servidor");
      }
    } catch (_err) {
      setError("Erro ao conectar com o servidor");
      onError?.("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Label htmlFor="email">Email Institucional</Label>
      <Input
        id="email"
        type="email"
        required
        placeholder="nome@instituicao.edu.br"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={Boolean(error)}
      />

      <Label htmlFor="password">Senha</Label>
      <Input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={Boolean(error)}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" isLoading={loading} className="w-full">
        Entrar
      </Button>
    </form>
  );
}

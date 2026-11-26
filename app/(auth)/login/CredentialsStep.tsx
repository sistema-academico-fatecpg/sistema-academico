"use client";

import { Input, Label } from "@/components/ui";

export function CredentialsStep({
  email,
  password,
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
}) {
  return (
    <>
      <Label>
        E-mail institucional
        <Input
          autoComplete="email"
          onChange={(event) => onEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </Label>
      <Label>
        Senha
        <Input
          autoComplete="current-password"
          onChange={(event) => onPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </Label>
    </>
  );
}

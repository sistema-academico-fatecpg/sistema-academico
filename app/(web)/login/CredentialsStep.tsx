"use client";

import { useState } from "react";
import { Field } from "@/components";

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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <Field
        autoComplete="email"
        label="E-mail institucional"
        onChange={(event) => onEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      <Field
        action={{
          iconName: showPassword ? "close" : "view",
          label: showPassword ? "Ocultar senha" : "Mostrar senha",
          onClick: () => setShowPassword((visible) => !visible),
        }}
        autoComplete="current-password"
        label="Senha"
        onChange={(event) => onPassword(event.target.value)}
        required
        type={showPassword ? "text" : "password"}
        value={password}
      />
    </>
  );
}

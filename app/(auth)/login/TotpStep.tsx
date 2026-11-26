"use client";

import { Input, Label } from "@/components/ui";

export function TotpStep({
  code,
  useRecoveryCode,
  onCode,
  onToggleMode,
}: {
  code: string;
  useRecoveryCode: boolean;
  onCode: (value: string) => void;
  onToggleMode: () => void;
}) {
  return (
    <>
      <Label>
        {useRecoveryCode ? "Código de recuperação" : "Código do autenticador"}
        <Input
          className="tracking-widest"
          inputMode={useRecoveryCode ? "text" : "numeric"}
          maxLength={useRecoveryCode ? 20 : 6}
          onChange={(event) =>
            onCode(useRecoveryCode ? event.target.value : event.target.value.replace(/\D/g, ""))
          }
          required
          value={code}
        />
      </Label>
      <button className="text-sm underline" onClick={onToggleMode} type="button">
        {useRecoveryCode
          ? "Usar o aplicativo autenticador"
          : "Perdi o celular: usar código de recuperação"}
      </button>
    </>
  );
}

import type { ReactNode } from "react";

/** Mensagens de erro/sucesso padronizadas (antes repetidas em ~8 formulários). */
export function FormFeedback({
  error,
  errors,
  message,
}: {
  error?: ReactNode;
  errors?: readonly string[] | null;
  message?: ReactNode;
}) {
  return (
    <>
      {errors && errors.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {errors.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </>
  );
}

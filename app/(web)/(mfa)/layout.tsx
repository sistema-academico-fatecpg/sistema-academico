import { Suspense } from "react";
import { requirePageUser } from "@/app/lib/auth/page-guard";

/**
 * Grupo da tela de configuração do segundo fator: exige login, mas NÃO aplica
 * o redirecionamento de MFA do guard comum (que causaria loop para si mesmo).
 */
export default function MfaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <MfaGuard>{children}</MfaGuard>
    </Suspense>
  );
}

async function MfaGuard({ children }: { children: React.ReactNode }) {
  await requirePageUser({ skipMfaRedirect: true });
  return children;
}

export const instant = false;

import { AuthCard, SetPasswordForm } from "@/components";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;
  return (
    <AuthCard>
      <SetPasswordForm code={code ?? ""} mode="reset" token={token ?? ""} />
    </AuthCard>
  );
}

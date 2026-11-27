export const instant = false;

import { AuthCard, SetPasswordForm } from "@/components";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard>
      <SetPasswordForm mode="reset" token={token ?? ""} />
    </AuthCard>
  );
}

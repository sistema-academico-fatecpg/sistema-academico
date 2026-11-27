export const instant = false;

import { AuthCard } from "@/components";
import { ResetForm } from "./ResetForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard>
      <ResetForm token={token ?? ""} />
    </AuthCard>
  );
}

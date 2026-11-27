export const instant = false;

import { AuthCard } from "@/components";
import { AtivarForm } from "./AtivarForm";

export default async function AtivarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;
  return (
    <AuthCard>
      <AtivarForm code={code ?? ""} token={token ?? ""} />
    </AuthCard>
  );
}

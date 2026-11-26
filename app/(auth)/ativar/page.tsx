export const instant = false;

import { AtivarForm } from "./AtivarForm";

export default async function AtivarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; code?: string }>;
}) {
  const { token, code } = await searchParams;
  return <AtivarForm token={token ?? ""} code={code ?? ""} />;
}

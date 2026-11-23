export const instant = false;

import { AtivarForm } from "./AtivarForm";

export default async function AtivarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AtivarForm token={token ?? ""} />;
}

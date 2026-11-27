export const instant = false;

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAuthenticatedUser } from "@/app/lib/auth/session";

async function SessionRedirect() {
  // A decisão depende da sessão da requisição. O boundary permite que o
  // redirect aconteça no streaming, sem virar erro no shell estático.
  await connection();
  const actor = await getAuthenticatedUser();
  redirect(actor ? "/dashboard" : "/login");
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <SessionRedirect />
    </Suspense>
  );
}

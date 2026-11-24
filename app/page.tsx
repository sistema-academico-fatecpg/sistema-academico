export const instant = false;

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth/session";

export default async function Home() {
  const actor = await getAuthenticatedUser();
  redirect(actor ? "/dashboard" : "/login");
}

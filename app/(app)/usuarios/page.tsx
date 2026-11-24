export const instant = false;

import { redirect } from "next/navigation";
import { visibleRolesFor } from "@/app/lib/auth/account-service";
import { getAuthenticatedUser } from "@/app/lib/auth/session";
import { UserRepository } from "@/app/repositories/user.repository";
import { hasPermission, PERMISSIONS } from "@/app/types/roles";

export default async function UsersPage() {
  const actor = await getAuthenticatedUser();
  if (!actor) redirect("/login");
  if (!hasPermission(actor.roles, PERMISSIONS.USERS_READ)) redirect("/");

  const { items } = await new UserRepository().list(
    { page: 1, pageSize: 100 },
    visibleRolesFor(actor.roles),
  );

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7a45]">
            Administração
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Usuários</h1>
        </div>
        <a
          className="rounded-lg bg-[#6b1720] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#501018]"
          href="/usuarios/novo"
        >
          Cadastrar usuário
        </a>
      </div>
      <p className="text-sm text-slate-500">
        A visão respeita o perfil do solicitante; perfis administrativos não aparecem para a
        secretaria.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr className="border-t border-zinc-100" key={user.id}>
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.roles.map((role) => role.role.name).join(", ")}</td>
                <td className="px-4 py-3">{user.status}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                  Nenhum usuário visível para o seu perfil.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

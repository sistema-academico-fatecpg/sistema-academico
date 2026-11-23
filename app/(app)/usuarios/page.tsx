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
    <section>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Usuários gerenciáveis</h1>
        <a className="text-sm underline" href="/usuarios/novo">
          Cadastrar usuário
        </a>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        A visão respeita o perfil do solicitante; perfis administrativos não aparecem para a
        secretaria.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-600">
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

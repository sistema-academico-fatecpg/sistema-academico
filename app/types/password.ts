import { z } from "zod";

/**
 * Hash de senha armazenado com Argon2id.
 *
 * A Política de Segurança (seção 8.3.5) exige armazenamento somente com
 * hash forte e salt (Argon2id ou bcrypt), nunca em texto puro ou com
 * criptografia reversível.
 *
 * Better Auth é o responsável pela geração e comparação destes hashes;
 * este tipo apenas tipifica o valor armazenado no banco de dados.
 */
export const PasswordHashSchema = z.string().min(1);
export type PasswordHash = z.infer<typeof PasswordHashSchema>;

/**
 * Resultado da comparação de uma senha em texto plano com um hash.
 */
export type PasswordCompareResult = {
  match: boolean;
};

/**
 * Operação de comparação de senha (plain, hash) -> match.
 *
 * A implementação real deve viver no provedor de autenticação (Better Auth)
 * e nunca ser exposta diretamente nos tipos de domínio.
 */
export type PasswordCompare = (plain: string, hash: PasswordHash) => Promise<PasswordCompareResult>;

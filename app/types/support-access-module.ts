import { z } from "zod";
import type { SupportAccessGrantId, SupportAccessModuleId, SystemModule } from "./common";
import {
  SupportAccessGrantIdSchema,
  SupportAccessModuleIdSchema,
  SystemModuleSchema,
} from "./common";

/**
 * Módulos vinculados a um acesso de suporte (tabela support_access_modules).
 *
 * Acesso restrito ao período e aos módulos aprovados (seção 10.8.2 da
 * Política de Segurança).
 */
export type SupportAccessModuleInput = {
  grantId: SupportAccessGrantId;
  module: SystemModule;
};

export const SupportAccessModuleInputSchema = z.object({
  grant_id: SupportAccessGrantIdSchema,
  module: SystemModuleSchema,
});

export type SupportAccessModule = {
  id: SupportAccessModuleId;
  grantId: SupportAccessGrantId;
  module: SystemModule;
};

export const SupportAccessModuleSchema = z.object({
  id: SupportAccessModuleIdSchema,
  grant_id: SupportAccessGrantIdSchema,
  module: SystemModuleSchema,
});

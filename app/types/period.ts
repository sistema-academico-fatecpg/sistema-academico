import { z } from "zod";
import type { DateTime, PeriodId } from "./common";
import { DateTimeSchema, PeriodIdSchema } from "./common";

export type PeriodInput = {
  name: string;
  opensAt: DateTime;
  closesAt: DateTime;
};

export const PeriodInputSchema = z.object({
  name: z.string().min(1),
  opens_at: DateTimeSchema,
  closes_at: DateTimeSchema,
});

export type Period = {
  id: PeriodId;
  name: string;
  opensAt: DateTime;
  closesAt: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
};

export const PeriodSchema = z.object({
  id: PeriodIdSchema,
  name: z.string().min(1),
  opens_at: DateTimeSchema,
  closes_at: DateTimeSchema,
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema,
});

import { z } from "zod";

export const EmailSchema = z.string().email();
export type Email = z.infer<typeof EmailSchema>;

export const DateTimeSchema = z.string().datetime({ offset: true });
export type DateTime = z.infer<typeof DateTimeSchema>;

export const DateStringSchema = z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
  message: "Data deve estar no formato YYYY-MM-DD",
});
export type DateString = z.infer<typeof DateStringSchema>;

export const InstitucionalEmailSchema = EmailSchema;
export type InstitucionalEmail = z.infer<typeof InstitucionalEmailSchema>;

export const PasswordHashSchema = z.string().min(1);
export type PasswordHash = z.infer<typeof PasswordHashSchema>;

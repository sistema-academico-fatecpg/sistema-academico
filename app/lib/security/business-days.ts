/**
 * Prazos em dias úteis usados pela política (8.8: 5 dias; 13/LGPD art. 48: 3
 * dias). Feriados são tratados pela instituição; aqui contamos seg–sex.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

export function isOverdue(deadline: Date | null, now = new Date()): boolean {
  return Boolean(deadline && now.getTime() > deadline.getTime());
}

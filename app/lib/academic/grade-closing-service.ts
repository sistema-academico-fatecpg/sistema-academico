import { createAuditService } from "@/app/lib/audit";
import { AUDIT_ACTIONS } from "@/app/lib/audit/audit-service";
import { db } from "@/app/lib/db";
import { AcademicPeriodRepository } from "@/app/repositories/period.repository";

/**
 * Fechamento automático pelo horário do servidor (9.2). Além de travar a
 * edição, gera uma cópia de segurança das notas antes de marcar o período como
 * fechado. A trava em si é reforçada em cada requisição por `gradesWindowOpen`.
 */
export async function closeExpiredGradePeriods(ipAddress = "maintenance"): Promise<number> {
  const periods = new AcademicPeriodRepository();
  const audit = createAuditService();
  const expired = await periods.listExpiredGradeWindows();

  for (const period of expired) {
    const grades = await db.grade.findMany({
      where: { enrollment: { classGroup: { academicPeriodId: period.id } } },
      include: {
        enrollment: {
          select: { id: true, studentId: true, classGroupId: true },
        },
      },
    });
    const snapshot = grades.map((grade) => ({
      enrollmentId: grade.enrollmentId,
      studentId: grade.enrollment.studentId,
      classGroupId: grade.enrollment.classGroupId,
      professorId: grade.professorId,
      value: grade.value ? Number(grade.value) : null,
      status: grade.status,
      updatedAt: grade.updatedAt.toISOString(),
    }));

    await periods.createSnapshot(
      period.id,
      JSON.parse(JSON.stringify({ periodId: period.id, grades: snapshot })) as never,
    );
    await periods.closeGrades(period.id);
    await audit.record({
      userId: null,
      role: null,
      ipAddress,
      action: AUDIT_ACTIONS.GRADES_PERIOD_CLOSED,
      module: "GRADES",
      recordType: "AcademicPeriod",
      recordId: period.id,
      result: "SUCCESS",
      newValue: { grades: snapshot.length, closedAt: new Date().toISOString() },
    });
  }

  return expired.length;
}

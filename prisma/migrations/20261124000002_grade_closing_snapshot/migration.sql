-- Controle de fechamento automático e cópia de segurança das notas (9.2).
ALTER TABLE "academic_periods" ADD COLUMN "grades_closed_at" TIMESTAMP(3);

CREATE TABLE "grade_closing_snapshots" (
    "id" TEXT NOT NULL,
    "academic_period_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_closing_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "grade_closing_snapshots_academic_period_id_created_at_idx" ON "grade_closing_snapshots"("academic_period_id", "created_at");

ALTER TABLE "grade_closing_snapshots" ADD CONSTRAINT "grade_closing_snapshots_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

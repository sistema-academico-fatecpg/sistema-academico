-- Dependências (DP) pendentes por aluno (seção 9.1).
CREATE TABLE "student_dependencies" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "student_dependencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_dependencies_student_id_subject_id_key" ON "student_dependencies"("student_id", "subject_id");
CREATE INDEX "student_dependencies_student_id_resolved_at_idx" ON "student_dependencies"("student_id", "resolved_at");

ALTER TABLE "student_dependencies" ADD CONSTRAINT "student_dependencies_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_dependencies" ADD CONSTRAINT "student_dependencies_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

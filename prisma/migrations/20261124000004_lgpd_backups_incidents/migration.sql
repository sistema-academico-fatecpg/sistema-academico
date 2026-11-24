-- LGPD, incidentes e backups (seções 11 e 13).
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'COPY', 'ELIMINATION');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'CONTAINED', 'ANALYZED', 'RESTORE_REQUESTED', 'RESTORED', 'NOTIFIED', 'CLOSED');
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL', 'SEMESTER_CLOSING');
CREATE TYPE "BackupStatus" AS ENUM ('CREATED', 'VERIFIED', 'RESTORE_TESTED', 'EXPIRED');

CREATE TABLE "data_subject_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "payload" JSONB,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_subject_requests_user_id_status_idx" ON "data_subject_requests"("user_id", "status");
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "reported_by" TEXT NOT NULL,
    "contained_by" TEXT,
    "analysis_report" TEXT,
    "backup_id" TEXT,
    "affected_record_ids" JSONB,
    "direction_authorization" TEXT,
    "notified_anpd_at" TIMESTAMP(3),
    "notified_subjects_at" TIMESTAMP(3),
    "evidence" JSONB,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contained_at" TIMESTAMP(3),
    "analyzed_at" TIMESTAMP(3),
    "restored_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "incidents_status_reported_at_idx" ON "incidents"("status", "reported_at");
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_contained_by_fkey" FOREIGN KEY ("contained_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "backup_records" (
    "id" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'CREATED',
    "destinations" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "retention_until" TIMESTAMP(3) NOT NULL,
    "restore_test_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    CONSTRAINT "backup_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "backup_records_type_created_at_idx" ON "backup_records"("type", "created_at");

ALTER TABLE "sensitive_data" ADD CONSTRAINT "sensitive_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

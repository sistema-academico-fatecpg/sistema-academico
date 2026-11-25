-- 8.4.2 / 10.6 / 11.3.2 / 15 / 16: controles que faltavam.
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'DPO_NOTIFICATION_DUE';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'CLOCK_DRIFT';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'KEY_ROTATION_OVERDUE';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'BACKUP_MEDIA_OVERDUE';
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'POLICY_REVIEW_OVERDUE';

CREATE TABLE "totp_used_codes" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "totp_used_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "totp_used_codes_key_key" ON "totp_used_codes"("key");
CREATE INDEX "totp_used_codes_used_at_idx" ON "totp_used_codes"("used_at");

CREATE TABLE "backup_media" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "locker_location" TEXT NOT NULL,
    "installed_at" TIMESTAMP(3) NOT NULL,
    "last_inspection_at" TIMESTAMP(3),
    "disconnected_at" TIMESTAMP(3),
    "retired_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "backup_media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "backup_media_status_installed_at_idx" ON "backup_media"("status", "installed_at");

CREATE TABLE "policy_violations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sanction" TEXT NOT NULL,
    "decided_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "policy_violations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "policy_violations_user_id_created_at_idx" ON "policy_violations"("user_id", "created_at");

CREATE TABLE "policy_reviews" (
    "id" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "next_review_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    CONSTRAINT "policy_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "policy_reviews_reviewed_at_idx" ON "policy_reviews"("reviewed_at");

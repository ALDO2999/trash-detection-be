-- Add new columns as nullable first so existing rows can be backfilled
ALTER TABLE "VoucherRedemption" ADD COLUMN "code" TEXT;
ALTER TABLE "VoucherRedemption" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill existing redemptions: generate a code and set expiry to 14 days after redemption
UPDATE "VoucherRedemption"
SET
  "code" = 'ECO-' || upper(substring(md5(random()::text || "id") for 5)) || '-' || upper(substring(md5(random()::text || "id" || 'x') for 5)),
  "expiresAt" = "redeemedAt" + interval '14 days'
WHERE "code" IS NULL;

-- Enforce NOT NULL now that all rows have values
ALTER TABLE "VoucherRedemption" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "VoucherRedemption" ALTER COLUMN "expiresAt" SET NOT NULL;

-- Unique constraint on code
CREATE UNIQUE INDEX "VoucherRedemption_code_key" ON "VoucherRedemption"("code");

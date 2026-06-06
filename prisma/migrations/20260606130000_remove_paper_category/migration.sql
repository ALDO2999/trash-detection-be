-- AlterEnum: hapus nilai PAPER dari enum WasteType
BEGIN;
CREATE TYPE "WasteType_new" AS ENUM ('PLASTIC', 'CARDBOARD', 'METAL', 'BATTERY', 'CLOTHES', 'SHOES');
ALTER TABLE "ScanResult" ALTER COLUMN "predictedType" TYPE "WasteType_new" USING ("predictedType"::text::"WasteType_new");
ALTER TABLE "Submission" ALTER COLUMN "wasteType" TYPE "WasteType_new" USING ("wasteType"::text::"WasteType_new");
ALTER TYPE "WasteType" RENAME TO "WasteType_old";
ALTER TYPE "WasteType_new" RENAME TO "WasteType";
DROP TYPE "WasteType_old";
COMMIT;

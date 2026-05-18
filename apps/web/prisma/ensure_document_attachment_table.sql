-- Idempotent: adds DocumentAttachment when migration history was never applied.
CREATE TABLE IF NOT EXISTS "DocumentAttachment" (
    "id" TEXT NOT NULL,
    "documentRequestId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAttachment_storedFilename_key" ON "DocumentAttachment"("storedFilename");

CREATE INDEX IF NOT EXISTS "DocumentAttachment_documentRequestId_idx" ON "DocumentAttachment"("documentRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAttachment_documentRequestId_fkey'
  ) THEN
    ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_documentRequestId_fkey"
      FOREIGN KEY ("documentRequestId") REFERENCES "DocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

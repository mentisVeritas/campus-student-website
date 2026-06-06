import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import type { DocumentAttachment } from "@prisma/client";
import { MAX_DOCUMENT_FILES, MAX_FILE_BYTES } from "@/lib/document-request-limits";
import { prisma } from "@/lib/prisma";

export { MAX_DOCUMENT_FILES, MAX_FILE_BYTES } from "@/lib/document-request-limits";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function inferMimeFromFilename(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return null;
}

export function uploadDir(): string {
  return join(process.cwd(), "storage", "document-requests");
}

export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir(), { recursive: true });
}

export function sanitizeStoredBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").slice(0, 120);
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe.length > 0 ? safe : "file";
}

export function validateFileList(files: File[]): string | null {
  if (files.length > MAX_DOCUMENT_FILES) {
    return `You can attach at most ${MAX_DOCUMENT_FILES} files.`;
  }
  for (const file of files) {
    const one = validateSingleFile(file);
    if (one) return one;
  }
  return null;
}

/** Prisma when migration `DocumentAttachment` was never applied */
export function isMissingDocumentAttachmentTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("DocumentAttachment") && message.includes("does not exist");
}

export function validateSingleFile(file: File): string | null {
  if (!file.size || file.size > MAX_FILE_BYTES) {
    return `Each file must be under ${MAX_FILE_BYTES / (1024 * 1024)} MB.`;
  }
  let mime = (file.type || "").toLowerCase();
  if (!mime) {
    const inferred = inferMimeFromFilename(file.name);
    if (inferred) mime = inferred;
  }
  if (!ALLOWED_MIME.has(mime)) {
    return "Allowed: PDF or images (JPEG, PNG, WebP, GIF, HEIC).";
  }
  return null;
}

/** Writes files and DB rows. Rolls back request + disk on failure. */
export async function saveAttachmentsForRequest(documentRequestId: string, files: File[]): Promise<DocumentAttachment[]> {
  if (files.length === 0) return [];

  const err = validateFileList(files);
  if (err) throw new Error(err);

  await ensureUploadDir();
  const dir = uploadDir();
  const writtenPaths: string[] = [];
  const created: DocumentAttachment[] = [];

  try {
    for (const file of files) {
      const storedFilename = `${randomUUID()}_${sanitizeStoredBasename(file.name)}`;
      let mime = (file.type || "").toLowerCase();
      if (!mime) {
        const inferred = inferMimeFromFilename(file.name);
        if (inferred) mime = inferred;
      }
      if (!mime) mime = "application/octet-stream";

      let row: DocumentAttachment;
      try {
        row = await prisma.documentAttachment.create({
          data: {
            documentRequestId,
            originalFilename: file.name.slice(0, 240),
            mimeType: mime,
            sizeBytes: file.size,
            storedFilename,
          },
        });
      } catch (e) {
        if (isMissingDocumentAttachmentTableError(e)) {
          throw new Error(
            "File attachments are not available: the DocumentAttachment table is missing. Run database migrations or submit without files.",
          );
        }
        throw e;
      }

      const fullPath = join(dir, storedFilename);
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(fullPath, buffer);
        writtenPaths.push(fullPath);
        created.push(row);
      } catch (diskErr) {
        await prisma.documentAttachment.delete({ where: { id: row.id } }).catch(() => {});
        throw diskErr;
      }
    }
    return created;
  } catch (e) {
    await prisma.documentRequest.delete({ where: { id: documentRequestId } }).catch(() => {});
    for (const p of writtenPaths) {
      await unlink(p).catch(() => {});
    }
    throw e;
  }
}

import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import type { DocumentAttachment, Prisma } from "@prisma/client";
import { DocumentType, RequestStatus, Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { isMissingDocumentAttachmentTableError, saveAttachmentsForRequest } from "@/lib/document-request-files";
import { serializeAttachments } from "@/lib/document-request-serialize";
import { isAllowedDocumentTypeForRole } from "@/lib/document-requests-ui";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  type: z.nativeEnum(DocumentType),
  description: z.string().max(2000).optional(),
});

function serializeRow(row: {
  id: string;
  type: DocumentType;
  description: string | null;
  status: RequestStatus;
  adminNote: string | null;
  requestedAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  reviewer: { firstName: string; lastName: string } | null;
  attachments: DocumentAttachment[];
}) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    status: row.status,
    adminNote: row.adminNote,
    requestedAt: row.requestedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewerName: row.reviewer
      ? `${row.reviewer.firstName} ${row.reviewer.lastName}`.trim()
      : null,
    attachments: serializeAttachments(row.attachments),
  };
}

function isUnknownRequesterFieldError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Unknown argument `requesterUserId`");
}

function isMissingRequesterColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") &&
    message.includes("requesterUserId") &&
    message.includes("DocumentRequest")
  );
}

function isMissingDocumentRequestColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("DocumentRequest.") && message.includes("does not exist");
}

/** Prisma prints `` `requesterUserId of relation DocumentRequest` `` — no `DocumentRequest.` prefix */
function isMissingRequesterUserIdRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") &&
    message.includes("requesterUserId") &&
    message.includes("DocumentRequest")
  );
}

function shouldRetryFindMany(error: unknown): boolean {
  return (
    isMissingDocumentRequestColumnError(error) ||
    isMissingDocumentAttachmentTableError(error) ||
    isMissingRequesterUserIdRelationError(error)
  );
}

/** DB never got migration adding `requesterUserId` — insert using legacy columns only (students). */
async function insertLegacyStudentDocumentRequest(
  studentId: string,
  type: DocumentType,
  description: string | null,
): Promise<string> {
  const id = randomUUID();
  try {
    await prisma.$executeRaw`
      INSERT INTO "DocumentRequest" ("id", "studentId", "type", "description", "status", "requestedAt", "updatedAt")
      VALUES (${id}, ${studentId}, ${type}, ${description}, ${RequestStatus.PENDING}, NOW(), NOW())
    `;
  } catch {
    try {
      await prisma.$executeRaw`
        INSERT INTO "DocumentRequest" ("id", "studentId", "type", "status", "requestedAt", "updatedAt")
        VALUES (${id}, ${studentId}, ${type}, ${RequestStatus.PENDING}, NOW(), NOW())
      `;
    } catch {
      await prisma.$executeRaw`
        INSERT INTO "DocumentRequest" ("id", "studentId", "type", "status", "submittedAt", "createdAt", "updatedAt")
        VALUES (${id}, ${studentId}, ${type}, 'PENDING', NOW(), NOW(), NOW())
      `;
    }
  }
  return id;
}

/** Staff requests: `studentId` null + `requesterUserId` (migration 20260428120000). Tiered SQL for schema drift. */
async function insertStaffDocumentRequestViaRaw(
  requesterUserId: string,
  type: DocumentType,
  description: string | null,
): Promise<string> {
  const id = randomUUID();
  try {
    await prisma.$executeRaw`
      INSERT INTO "DocumentRequest" ("id", "studentId", "requesterUserId", "type", "description", "status", "requestedAt", "updatedAt")
      VALUES (${id}, NULL, ${requesterUserId}, ${type}, ${description}, ${RequestStatus.PENDING}, NOW(), NOW())
    `;
  } catch {
    try {
      await prisma.$executeRaw`
        INSERT INTO "DocumentRequest" ("id", "studentId", "requesterUserId", "type", "status", "requestedAt", "updatedAt")
        VALUES (${id}, NULL, ${requesterUserId}, ${type}, ${RequestStatus.PENDING}, NOW(), NOW())
      `;
    } catch {
      await prisma.$executeRaw`
        INSERT INTO "DocumentRequest" ("id", "studentId", "requesterUserId", "type", "status", "submittedAt", "createdAt", "updatedAt")
        VALUES (${id}, NULL, ${requesterUserId}, ${type}, 'PENDING', NOW(), NOW(), NOW())
      `;
    }
  }
  return id;
}

/** When Prisma rejects `where: { requesterUserId }`, list IDs via SQL then load by primary key (avoids broken Prisma filter on staff). */
async function findRequestIdsForUserViaRawSql(userId: string): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "DocumentRequest" WHERE "requesterUserId" = ${userId}
    `;
    return rows.map((r) => r.id);
  } catch (error) {
    console.warn("[document-requests GET] raw SELECT by requesterUserId failed", error);
    return null;
  }
}

function isRequesterFieldUnsupportedError(error: unknown): boolean {
  return (
    isUnknownRequesterFieldError(error) ||
    isMissingRequesterColumnError(error) ||
    isMissingRequesterUserIdRelationError(error)
  );
}

type RowShape = {
  id: string;
  type: DocumentType;
  description: string | null;
  status: RequestStatus;
  adminNote: string | null;
  requestedAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  reviewer: { firstName: string; lastName: string } | null;
  attachments: DocumentAttachment[];
};

async function findRequestsForWhere(where: Prisma.DocumentRequestWhereInput): Promise<RowShape[]> {
  try {
    const rows = await prisma.documentRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        reviewedAt: true,
        reviewer: { select: { firstName: true, lastName: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    return rows as RowShape[];
  } catch (error) {
    if (!shouldRetryFindMany(error)) {
      throw error;
    }
  }

  try {
    const rows = await prisma.documentRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        reviewer: { select: { firstName: true, lastName: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    return rows.map((row) => ({
      ...row,
      reviewedAt: null,
    })) as RowShape[];
  } catch (error) {
    if (!shouldRetryFindMany(error)) {
      throw error;
    }
  }

  try {
    const rows = await prisma.documentRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    return rows.map((row) => ({
      ...row,
      reviewedAt: null,
      reviewer: null,
    })) as RowShape[];
  } catch (error) {
    if (!shouldRetryFindMany(error)) {
      throw error;
    }
  }

  // No attachments relation — DocumentAttachment table may be missing (H4)
  try {
    const rows = await prisma.documentRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        reviewedAt: true,
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });
    return rows.map((row) => ({
      ...row,
      attachments: [] as DocumentAttachment[],
    })) as RowShape[];
  } catch (error) {
    if (!shouldRetryFindMany(error)) {
      throw error;
    }
  }

  const rowsMinimal = await prisma.documentRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      type: true,
      description: true,
      status: true,
      adminNote: true,
      requestedAt: true,
      updatedAt: true,
    },
  });
  return rowsMinimal.map((row) => ({
    ...row,
    reviewedAt: null,
    reviewer: null,
    attachments: [] as DocumentAttachment[],
  })) as RowShape[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session || !hasRole(session, [Role.STUDENT, Role.TEACHER, Role.CANTEEN_STAFF])) {
      return fail("Forbidden", 403);
    }

    let rows: RowShape[] = [];
    try {
      rows = await findRequestsForWhere({ requesterUserId: session.userId });
    } catch (error) {
      if (!isRequesterFieldUnsupportedError(error)) {
        throw error;
      }
      if (session.role === Role.STUDENT) {
        const student = await prisma.student.findUnique({
          where: { userId: session.userId },
          select: { id: true },
        });
        if (!student) {
          rows = [];
        } else {
          rows = await findRequestsForWhere({ studentId: student.id });
        }
      } else {
        const ids = await findRequestIdsForUserViaRawSql(session.userId);
        if (ids === null) {
          return fail(
            "Database is missing DocumentRequest.requesterUserId (or it cannot be queried). From the repo root run: npx prisma db execute --file prisma/migrations/20260428120000_document_request_requesters/migration.sql — or fix migrate history (non-empty DB: prisma migrate docs / baseline) then prisma migrate deploy.",
            503,
          );
        }
        rows = ids.length === 0 ? [] : await findRequestsForWhere({ id: { in: ids } });
      }
    }

    return ok(rows.map((row) => serializeRow({ ...row, attachments: row.attachments })));
  } catch (error) {
    console.error("[document-requests GET]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return fail(`Could not load document requests: ${detail}`, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session || !hasRole(session, [Role.STUDENT, Role.TEACHER, Role.CANTEEN_STAFF])) {
      return fail("Forbidden", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return fail("User not found", 404);
    }

    const contentType = request.headers.get("content-type") ?? "";
    let typeValue: unknown;
    let descriptionValue: string | undefined;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      typeValue = form.get("type");
      const desc = form.get("description");
      descriptionValue = typeof desc === "string" ? desc : undefined;
      files = form.getAll("files").filter((item): item is File => item instanceof File);
    } else {
      const body = await request.json().catch(() => null);
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return fail("Invalid request body", 400);
      }
      typeValue = parsed.data.type;
      descriptionValue = parsed.data.description;
    }

    const typeParsed = z.nativeEnum(DocumentType).safeParse(typeValue);
    if (!typeParsed.success) {
      return fail("Invalid document type", 400);
    }

    const descriptionTrimmed = descriptionValue?.trim() || undefined;
    if (descriptionTrimmed !== undefined && descriptionTrimmed.length > 2000) {
      return fail("Description too long", 400);
    }

    if (!isAllowedDocumentTypeForRole(user.role, typeParsed.data)) {
      return fail("This document type is not available for your role", 400);
    }

    let studentId: string | null = null;
    if (user.role === Role.STUDENT) {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!student) {
        return fail("Student profile not found", 404);
      }
      studentId = student.id;
    }

    const data: Prisma.DocumentRequestUncheckedCreateInput = {
      requesterUserId: user.id,
      studentId,
      type: typeParsed.data,
      description: descriptionTrimmed ?? null,
    };

    let createdId: string;
    try {
      const created = await prisma.documentRequest.create({
        data,
        include: {
          reviewer: { select: { firstName: true, lastName: true } },
          attachments: true,
        },
      });
      createdId = created.id;
    } catch (error) {
      if (isMissingRequesterUserIdRelationError(error)) {
        if (user.role === Role.STUDENT && studentId) {
          createdId = await insertLegacyStudentDocumentRequest(
            studentId,
            typeParsed.data,
            descriptionTrimmed ?? null,
          );
        } else if (user.role === Role.TEACHER || user.role === Role.CANTEEN_STAFF) {
          try {
            createdId = await insertStaffDocumentRequestViaRaw(
              user.id,
              typeParsed.data,
              descriptionTrimmed ?? null,
            );
          } catch {
            return fail(
              "Cannot submit document requests until the database migration adding the document-request requester columns has been applied.",
              503,
            );
          }
        } else {
          return fail(
            "Cannot submit document requests until the database migration adding the document-request requester columns has been applied.",
            503,
          );
        }
      } else if (!shouldRetryFindMany(error)) {
        throw error;
      } else {
        try {
          const created = await prisma.documentRequest.create({
            data,
            include: {
              reviewer: { select: { firstName: true, lastName: true } },
            },
          });
          createdId = created.id;
        } catch (error2) {
          if (!shouldRetryFindMany(error2)) {
            throw error2;
          }
          const created = await prisma.documentRequest.create({ data });
          createdId = created.id;
        }
      }
    }

    try {
      if (files.length > 0) {
        await saveAttachmentsForRequest(createdId, files);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return fail(message, 400);
    }

    const rows = await findRequestsForWhere({ id: createdId });
    const row = rows[0];
    if (!row) {
      return fail("Could not load created request", 500);
    }

    return ok(serializeRow(row), 201);
  } catch (error) {
    console.error("[document-requests POST]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return fail(`Could not submit document request: ${detail}`, 500);
  }
}

import type { DocumentType, Prisma, RequestStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { NotificationType, RequestStatus as RequestStatusEnum, Role } from "@prisma/client";
import { z } from "zod";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { documentsInboxHref, documentTypeLabel } from "@/lib/document-requests-ui";
import { fail, ok } from "@/lib/api-response";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const schema = z
  .object({
    status: z.nativeEnum(RequestStatusEnum),
    adminNote: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === RequestStatusEnum.REJECTED) {
      const note = data.adminNote?.trim() ?? "";
      if (note.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A short rejection reason is required for the applicant (min 3 characters).",
          path: ["adminNote"],
        });
      }
    }
  });

function isSchemaDriftError(error: unknown): boolean {
  const m = error instanceof Error ? error.message : String(error);
  return m.includes("does not exist") && (m.includes("DocumentRequest") || m.includes("column"));
}

/** Without this, Prisma RETURNING pulls every model column — legacy DBs lack `requesterUserId` etc. */
const selectPatchFull = {
  id: true,
  type: true,
  status: true,
  adminNote: true,
  reviewedAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentRequestSelect;

const selectPatchNoReview = {
  id: true,
  type: true,
  status: true,
  adminNote: true,
  updatedAt: true,
} satisfies Prisma.DocumentRequestSelect;

const selectPatchStatusOnly = {
  id: true,
  type: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.DocumentRequestSelect;

type PatchedDoc = {
  id: string;
  type: DocumentType;
  status: RequestStatus;
  adminNote: string | null;
  reviewedAt: Date | null;
  updatedAt: Date;
};

async function patchDocumentRow(params: {
  id: string;
  adminUserId: string;
  status: RequestStatus;
  noteTrimmed: string | undefined;
  adminNoteFieldPresent: boolean;
  now: Date;
}): Promise<PatchedDoc> {
  const adminNoteData =
    params.adminNoteFieldPresent && params.noteTrimmed !== undefined
      ? {
          adminNote:
            params.noteTrimmed && params.noteTrimmed.length > 0 ? params.noteTrimmed : null,
        }
      : {};

  try {
    const row = await prisma.documentRequest.update({
      where: { id: params.id },
      data: {
        status: params.status,
        reviewedAt: params.now,
        reviewedByUserId: params.adminUserId,
        ...adminNoteData,
      },
      select: selectPatchFull,
    });
    return {
      ...row,
      adminNote: row.adminNote ?? null,
      reviewedAt: row.reviewedAt ?? null,
    };
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
  }

  try {
    const row = await prisma.documentRequest.update({
      where: { id: params.id },
      data: {
        status: params.status,
        ...adminNoteData,
      },
      select: selectPatchNoReview,
    });
    return {
      ...row,
      adminNote: row.adminNote ?? null,
      reviewedAt: null,
    };
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
  }

  try {
    const row = await prisma.documentRequest.update({
      where: { id: params.id },
      data: {
        status: params.status,
        ...adminNoteData,
      },
      select: selectPatchStatusOnly,
    });
    return {
      ...row,
      adminNote:
        params.adminNoteFieldPresent && params.noteTrimmed !== undefined
          ? params.noteTrimmed && params.noteTrimmed.length > 0
            ? params.noteTrimmed
            : null
          : null,
      reviewedAt: null,
    };
  } catch (error) {
    if (!isSchemaDriftError(error)) throw error;
  }

  const row = await prisma.documentRequest.update({
    where: { id: params.id },
    data: {
      status: params.status,
    },
    select: selectPatchStatusOnly,
  });
  return {
    ...row,
    adminNote: null,
    reviewedAt: null,
  };
}

async function resolveNotifyTarget(documentRequestId: string): Promise<{ userId: string | null; role: Role }> {
  try {
    const dr = await prisma.documentRequest.findUnique({
      where: { id: documentRequestId },
      select: { requesterUserId: true, studentId: true },
    });
    if (dr?.requesterUserId) {
      const u = await prisma.user.findUnique({
        where: { id: dr.requesterUserId },
        select: { role: true },
      });
      if (u) {
        return { userId: dr.requesterUserId, role: u.role };
      }
    }
    if (dr?.studentId) {
      const st = await prisma.student.findUnique({
        where: { id: dr.studentId },
        select: { userId: true, user: { select: { role: true } } },
      });
      if (st?.user) {
        return { userId: st.userId, role: st.user.role };
      }
    }
  } catch {
    const dr = await prisma.documentRequest.findUnique({
      where: { id: documentRequestId },
      select: { studentId: true },
    });
    if (dr?.studentId) {
      const st = await prisma.student.findUnique({
        where: { id: dr.studentId },
        select: { userId: true, user: { select: { role: true } } },
      });
      if (st?.user) {
        return { userId: st.userId, role: st.user.role };
      }
    }
  }
  return { userId: null, role: Role.STUDENT };
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.adminNote?.[0] ?? "Invalid request body";
    return fail(msg, 400);
  }

  const noteTrimmed = parsed.data.adminNote?.trim();
  const now = new Date();
  const adminNoteFieldPresent = parsed.data.adminNote !== undefined;

  try {
    const updated = await patchDocumentRow({
      id,
      adminUserId: session.userId,
      status: parsed.data.status,
      noteTrimmed,
      adminNoteFieldPresent,
      now,
    });

    const typeTitle = documentTypeLabel(updated.type);
    const { userId: notifyUserId, role: roleForInbox } = await resolveNotifyTarget(id);
    const inbox = documentsInboxHref(roleForInbox);

    const resolvedNote =
      parsed.data.adminNote !== undefined
        ? noteTrimmed && noteTrimmed.length > 0
          ? noteTrimmed
          : undefined
        : undefined;

    let title: string;
    let message: string;

    switch (parsed.data.status) {
      case RequestStatusEnum.PENDING:
        title = "Document request queued again";
        message = `Your ${typeTitle} request was returned to the queue.${resolvedNote ? ` Note: ${resolvedNote}` : ""}`;
        break;
      case RequestStatusEnum.IN_PROGRESS:
        title = "Document request — under review";
        message = `Registry is processing your ${typeTitle} request.${resolvedNote ? ` Details: ${resolvedNote}` : ""}`;
        break;
      case RequestStatusEnum.DONE:
        title = "Document request approved";
        message = `Your ${typeTitle} request was approved.${resolvedNote ? ` Instructions: ${resolvedNote}` : " Check the Documents page for pickup or digital delivery info."}`;
        break;
      case RequestStatusEnum.REJECTED:
        title = "Document request declined";
        message = `Your ${typeTitle} request could not be fulfilled.${resolvedNote ? ` Reason: ${resolvedNote}` : ""}`;
        break;
      default:
        title = "Document request updated";
        message = `Your ${typeTitle} request status is now ${parsed.data.status}.`;
    }

    if (notifyUserId) {
      await createNotification(notifyUserId, NotificationType.DOCUMENT_STATUS, title, message, inbox);
    }

    return ok({
      id: updated.id,
      status: updated.status,
      adminNote: updated.adminNote,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin document-requests PATCH]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return fail(`Could not update document request: ${detail}`, 500);
  }
}

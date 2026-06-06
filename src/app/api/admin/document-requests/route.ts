import type { DocumentAttachment, DocumentType, Prisma, RequestStatus } from "@prisma/client";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { serializeAttachments } from "@/lib/document-request-serialize";
import { documentTypeLabel } from "@/lib/document-requests-ui";
import {
  isMissingDocumentAttachmentTableError,
} from "@/lib/document-request-files";
import { fail, ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type AdminApiRequester = {
  name: string;
  email: string;
  role: Role;
};

/** Aligns with document-requests/route.ts shouldRetryFindMany */
function isMissingDocumentRequestColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("DocumentRequest.") && message.includes("does not exist");
}

function isMissingRequesterUserIdRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") &&
    message.includes("requesterUserId") &&
    message.includes("DocumentRequest")
  );
}

function shouldRetryAdminFetch(error: unknown): boolean {
  return (
    isMissingDocumentRequestColumnError(error) ||
    isMissingDocumentAttachmentTableError(error) ||
    isMissingRequesterUserIdRelationError(error)
  );
}

type AdminItem = {
  id: string;
  type: DocumentType;
  description: string | null;
  status: RequestStatus;
  adminNote: string | null;
  requestedAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  requester: { firstName: string; lastName: string; email: string; role: Role } | null;
  reviewer: { firstName: string; lastName: string } | null;
  student:
    | {
        user: { firstName: string; lastName: string; email: string };
        class: { name: string } | null;
      }
    | null;
  attachments: DocumentAttachment[];
};

const studentForInclude = {
  include: {
    user: { select: { firstName: true, lastName: true, email: true } },
    class: { select: { name: true } },
  },
};

const studentForSelect = {
  select: {
    user: { select: { firstName: true, lastName: true, email: true } },
    class: { select: { name: true } },
  },
};

/** Tier 2 sometimes returns [] attachments while only the attachment table / join failed; tier 3+ may skip loading. Fill from DB so admins see filenames and links. */
async function mergeAttachmentsFromDb(items: AdminItem[]): Promise<AdminItem[]> {
  if (items.length === 0) return items;
  if (!items.some((i) => i.attachments.length === 0)) return items;
  const ids = items.map((i) => i.id);
  try {
    const rows = await prisma.documentAttachment.findMany({
      where: { documentRequestId: { in: ids } },
      orderBy: { createdAt: "asc" },
    });
    const byRequest = new Map<string, DocumentAttachment[]>();
    for (const row of rows) {
      const list = byRequest.get(row.documentRequestId) ?? [];
      list.push(row);
      byRequest.set(row.documentRequestId, list);
    }
    return items.map((item) => {
      const fromDb = byRequest.get(item.id);
      if (fromDb?.length) {
        return { ...item, attachments: fromDb };
      }
      return item;
    });
  } catch {
    return items;
  }
}

async function fetchAdminRequests(): Promise<AdminItem[]> {
  const orderBy = { requestedAt: "desc" as const };

  const includeWithAttachments = {
    student: studentForInclude,
    requester: {
      select: { firstName: true, lastName: true, email: true, role: true },
    },
    reviewer: { select: { firstName: true, lastName: true } },
    attachments: { orderBy: { createdAt: "asc" as const } },
  } satisfies Prisma.DocumentRequestInclude;

  try {
    const rows = await prisma.documentRequest.findMany({
      include: includeWithAttachments,
      orderBy,
    });
    return mergeAttachmentsFromDb(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        status: row.status,
        adminNote: row.adminNote,
        requestedAt: row.requestedAt,
        updatedAt: row.updatedAt,
        reviewedAt: row.reviewedAt,
        requester: row.requester,
        reviewer: row.reviewer,
        student: row.student,
        attachments: row.attachments,
      })),
    );
  } catch (error) {
    if (!shouldRetryAdminFetch(error)) throw error;
  }

  try {
    const { attachments: _a, ...includeNoAtt } = includeWithAttachments;
    const rows = await prisma.documentRequest.findMany({
      include: includeNoAtt,
      orderBy,
    });
    return mergeAttachmentsFromDb(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        status: row.status,
        adminNote: row.adminNote,
        requestedAt: row.requestedAt,
        updatedAt: row.updatedAt,
        reviewedAt: row.reviewedAt,
        requester: row.requester,
        reviewer: row.reviewer,
        student: row.student,
        attachments: [] as DocumentAttachment[],
      })),
    );
  } catch (error) {
    if (!shouldRetryAdminFetch(error)) throw error;
  }

  // Legacy DB: no requesterUserId column — omit request relation (select only existing scalars / joins)
  try {
    const rows = await prisma.documentRequest.findMany({
      orderBy,
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        reviewedAt: true,
        student: studentForSelect,
        reviewer: { select: { firstName: true, lastName: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    return mergeAttachmentsFromDb(
      rows.map((row) => ({
        ...row,
        requester: null,
        attachments: row.attachments ?? [],
      })),
    );
  } catch (error) {
    if (!shouldRetryAdminFetch(error)) throw error;
  }

  try {
    const rows = await prisma.documentRequest.findMany({
      orderBy,
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        student: studentForSelect,
        reviewer: { select: { firstName: true, lastName: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    return mergeAttachmentsFromDb(
      rows.map((row) => ({
        ...row,
        reviewedAt: null,
        requester: null,
        attachments: row.attachments ?? [],
      })),
    );
  } catch (error) {
    if (!shouldRetryAdminFetch(error)) throw error;
  }

  try {
    const rows = await prisma.documentRequest.findMany({
      orderBy,
      select: {
        id: true,
        type: true,
        description: true,
        status: true,
        adminNote: true,
        requestedAt: true,
        updatedAt: true,
        reviewedAt: true,
        student: studentForSelect,
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });
    return mergeAttachmentsFromDb(
      rows.map((row) => ({
        ...row,
        requester: null,
        attachments: [] as DocumentAttachment[],
      })),
    );
  } catch (error) {
    if (!shouldRetryAdminFetch(error)) throw error;
  }

  const rowsMinimal = await prisma.documentRequest.findMany({
    orderBy,
    select: {
      id: true,
      type: true,
      description: true,
      status: true,
      adminNote: true,
      requestedAt: true,
      updatedAt: true,
      student: studentForSelect,
    },
  });
  const minimal = rowsMinimal.map((row) => ({
    ...row,
    reviewedAt: null,
    reviewer: null,
    requester: null,
    attachments: [] as DocumentAttachment[],
  }));
  return mergeAttachmentsFromDb(minimal);
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session || !hasRole(session, ["ADMIN"])) {
    return fail("Forbidden", 403);
  }

  const serializeRequester = (item: AdminItem): AdminApiRequester => {
    if (item.requester) {
      return {
        name: `${item.requester.firstName} ${item.requester.lastName}`.trim(),
        email: item.requester.email,
        role: item.requester.role,
      };
    }
    const su = item.student?.user;
    if (su) {
      return {
        name: `${su.firstName} ${su.lastName}`.trim(),
        email: su.email,
        role: Role.STUDENT,
      };
    }
    return {
      name: "Unknown submitter",
      email: "",
      role: Role.STUDENT,
    };
  };

  try {
    const requests = await fetchAdminRequests();

    return ok(
      requests.map((item) => ({
        id: item.id,
        type: item.type,
        typeLabel: documentTypeLabel(item.type),
        status: item.status,
        description: item.description,
        adminNote: item.adminNote,
        requestedAt: item.requestedAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        requester: serializeRequester(item),
        reviewerName: item.reviewer
          ? `${item.reviewer.firstName} ${item.reviewer.lastName}`.trim()
          : null,
        student: item.student?.user
          ? {
              name: `${item.student.user.firstName} ${item.student.user.lastName}`.trim(),
              className: item.student.class?.name ?? null,
            }
          : null,
        attachments: serializeAttachments(item.attachments ?? []),
      })),
    );
  } catch (error) {
    console.error("[admin document-requests GET]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return fail(`Could not load document requests: ${detail}`, 500);
  }
}

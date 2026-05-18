import { readFile } from "fs/promises";
import { join } from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiSession } from "@/lib/api-auth";
import { getApiSession, hasRole } from "@/lib/api-auth";
import { uploadDir } from "@/lib/document-request-files";
import { fail } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

type AttachmentForDownload = {
  storedFilename: string;
  mimeType: string;
  originalFilename: string;
  documentRequest: {
    requesterUserId?: string | null;
    studentId?: string | null;
  };
};

async function loadAttachmentRow(attachmentId: string): Promise<AttachmentForDownload | null> {
  try {
    const row = await prisma.documentAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        storedFilename: true,
        mimeType: true,
        originalFilename: true,
        documentRequest: {
          select: {
            requesterUserId: true,
            studentId: true,
          },
        },
      },
    });
    return row;
  } catch {
    const row = await prisma.documentAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        storedFilename: true,
        mimeType: true,
        originalFilename: true,
        documentRequest: {
          select: {
            studentId: true,
          },
        },
      },
    });
    return row;
  }
}

async function isSubmitter(session: ApiSession, doc: AttachmentForDownload["documentRequest"]): Promise<boolean> {
  if (doc.requesterUserId === session.userId) {
    return true;
  }
  if (!doc.studentId) {
    return false;
  }
  const student = await prisma.student.findUnique({
    where: { id: doc.studentId },
    select: { userId: true },
  });
  return student?.userId === session.userId;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getApiSession(_request);
  if (!session) {
    return fail("Unauthorized", 401);
  }

  const { attachmentId } = await context.params;

  const attachment = await loadAttachmentRow(attachmentId);

  if (!attachment) {
    return fail("Not found", 404);
  }

  const isAdmin = hasRole(session, ["ADMIN"]);
  const owner = await isSubmitter(session, attachment.documentRequest);
  if (!owner && !isAdmin) {
    return fail("Forbidden", 403);
  }

  const path = join(uploadDir(), attachment.storedFilename);
  let buffer: Buffer;
  try {
    buffer = await readFile(path);
  } catch {
    return fail("File missing on server", 404);
  }

  const asciiName = attachment.originalFilename.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalFilename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

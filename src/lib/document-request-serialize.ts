/** Attachment JSON for APIs — no server-only imports. */

export type AttachmentDto = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

export function documentAttachmentDownloadUrl(attachmentId: string): string {
  return `/api/document-requests/attachments/${attachmentId}/file`;
}

export function serializeAttachments(
  rows: { id: string; originalFilename: string; mimeType: string; sizeBytes: number }[],
): AttachmentDto[] {
  return rows.map((a) => ({
    id: a.id,
    originalFilename: a.originalFilename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    downloadUrl: documentAttachmentDownloadUrl(a.id),
  }));
}

import { DocumentType, Role } from "@prisma/client";

const STUDENT_TYPES: DocumentType[] = [
  DocumentType.ENROLLMENT_CERT,
  DocumentType.TRANSCRIPT,
  DocumentType.DORMITORY_CERT,
  DocumentType.SCHOLARSHIP_CERT,
  DocumentType.OTHER,
];

const TEACHER_TYPES: DocumentType[] = [DocumentType.TEACHER_EMPLOYMENT_CERT, DocumentType.OTHER];

const CANTEEN_TYPES: DocumentType[] = [DocumentType.CANTEEN_EMPLOYMENT_CERT, DocumentType.OTHER];

export function documentsInboxHref(role: Role): string {
  switch (role) {
    case Role.STUDENT:
      return "/dashboard/student/documents";
    case Role.TEACHER:
      return "/dashboard/teacher/documents";
    case Role.CANTEEN_STAFF:
      return "/dashboard/canteen/documents";
    case Role.ADMIN:
      return "/dashboard/admin/document-requests";
    default:
      return "/dashboard/student/documents";
  }
}

export function allowedDocumentTypesForRole(role: Role): DocumentType[] {
  switch (role) {
    case Role.STUDENT:
      return STUDENT_TYPES;
    case Role.TEACHER:
      return TEACHER_TYPES;
    case Role.CANTEEN_STAFF:
      return CANTEEN_TYPES;
    default:
      return [];
  }
}

export function canRoleRequestDocuments(role: Role): boolean {
  return allowedDocumentTypesForRole(role).length > 0;
}

export function isAllowedDocumentTypeForRole(role: Role, type: DocumentType): boolean {
  return allowedDocumentTypesForRole(role).includes(type);
}

const LABELS: Record<DocumentType, string> = {
  ENROLLMENT_CERT: "Enrollment / study certificate",
  TRANSCRIPT: "Official transcript",
  DORMITORY_CERT: "Dormitory residence certificate",
  SCHOLARSHIP_CERT: "Scholarship confirmation",
  TEACHER_EMPLOYMENT_CERT: "Employment / HR verification letter",
  CANTEEN_EMPLOYMENT_CERT: "Kitchen & staff verification letter",
  OTHER: "Other official letter",
};

export function documentTypeLabel(type: DocumentType): string {
  return LABELS[type] ?? type;
}

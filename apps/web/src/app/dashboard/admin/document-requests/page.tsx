import AdminDocumentRequestsClient from "@/components/documents/admin-document-requests-client";
import PageHeader from "@/components/layout/PageHeader";

export default function AdminDocumentRequestsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Document requests"
        description="Incoming queue from students, teachers, and canteen staff. Update status when you verify details — applicants see changes immediately with optional registry notes."
      />
      <AdminDocumentRequestsClient />
    </div>
  );
}

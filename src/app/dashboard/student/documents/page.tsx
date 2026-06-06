import DocumentRequestsPanel from "@/components/documents/document-requests-panel";

export default function StudentDocumentsPage() {
  return (
    <DocumentRequestsPanel
      variant="student"
      title="Official documents"
      description="Request certificates about your studies, scholarship, or dormitory. Registry staff review each submission and reply here with pickup details or decline reasons."
    />
  );
}

import { ClipboardList } from "lucide-react";
import EmptyState from "@/components/common/empty-state";
import PageContainer from "@/components/common/page-container";

export default function BulletinPage() {
  return (
    <PageContainer
      title="Bulletin Board"
      description="Campus bulletin for study materials, student-to-student exchange, and requests."
      breadcrumbs={[
        { label: "Campus LMS", href: "/dashboard" },
        { label: "Bulletin Board" },
      ]}
    >
      <EmptyState
        icon={ClipboardList}
        title="No active bulletin posts"
        description="The student board is empty right now. Publish your first post to buy, sell, or exchange study materials."
        actionLabel="Create New Post"
        actionHref="/dashboard/bulletin"
      />
    </PageContainer>
  );
}

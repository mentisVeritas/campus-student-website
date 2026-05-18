import { Trophy } from "lucide-react";
import EmptyState from "@/components/common/empty-state";
import PageContainer from "@/components/common/page-container";

export default function PortfolioPage() {
  return (
    <PageContainer
      title="Portfolio"
      description="Showcase verified achievements, projects, and certifications in your student portfolio."
      breadcrumbs={[
        { label: "Campus LMS", href: "/dashboard" },
        { label: "Portfolio" },
      ]}
    >
      <EmptyState
        icon={Trophy}
        title="No achievements uploaded yet"
        description="Build your academic portfolio with course projects, hackathon wins, and certificates to support scholarship and internship applications."
        actionLabel="Add Achievement"
        actionHref="/dashboard/portfolio"
      />
    </PageContainer>
  );
}

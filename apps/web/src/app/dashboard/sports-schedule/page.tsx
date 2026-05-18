import { Dumbbell } from "lucide-react";
import EmptyState from "@/components/common/empty-state";
import PageContainer from "@/components/common/page-container";

export default function ClubsSchedulePage() {
  return (
    <PageContainer
      title="Club Schedule"
      description="Training sessions and fitness activities available for students."
      breadcrumbs={[
        { label: "Campus LMS", href: "/dashboard" },
        { label: "Club Schedule" },
      ]}
    >
      <EmptyState
        icon={Dumbbell}
        title="No club sessions published yet"
        description="Club schedules will be posted by coaches with times, courts, and participant limits."
        actionLabel="Open Club Registration"
        actionHref="/dashboard/sports-registration"
      />
    </PageContainer>
  );
}

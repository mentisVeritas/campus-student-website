import { CalendarPlus } from "lucide-react";
import EmptyState from "@/components/common/empty-state";
import PageContainer from "@/components/common/page-container";

export default function EventRegistrationPage() {
  return (
    <PageContainer
      title="Event Registration"
      description="Register for academic and student-life events with participation tracking."
      breadcrumbs={[
        { label: "Campus LMS", href: "/dashboard" },
        { label: "Event Registration" },
      ]}
    >
      <EmptyState
        icon={CalendarPlus}
        title="No event registration forms available"
        description="There are currently no open forms. Check back after new events are published by faculty or student clubs."
        actionLabel="Browse Campus Events"
        actionHref="/dashboard/events"
      />
    </PageContainer>
  );
}
